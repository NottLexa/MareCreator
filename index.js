// by NotLexa

const platform = document.getElementById('script').hasAttribute('platform')
    ? document.getElementById('script').getAttribute('platform') : 'WEB';

var attributes_frame = document.getElementById('attributes_frame');
var templates_select_list = document.getElementById('templates_select_list');

var fs, path;

const dices_engine = require('./core/dices_engine.cjs');

var dices_object = new dices_engine.DicesObject();

var server = '127.0.0.1:63342';
var template_list = [];

var attributes = {};
var effect_execution_order = [];

const change_template = function(option_element) {
    let template_index = option_element.value;
    attributes = dices_engine.get_attributes(template_list[template_index].attributes);

    for (let attribute_name in attributes) {
        try {
            attributes[attribute_name] = dices_engine.parse_attribute_effects(attributes[attribute_name]);
        } catch (error) {
            alert(attribute_name+': '+error);
        }
    }
    update_attributes_list();
};

const update_templates_list = async function() {
    if (platform === 'NODE') {
        fs = require('fs');
        path = require('path');
        try {
            let templates = fs.readdirSync('data/templates', {encoding: "utf8"});
            template_list.splice(0, template_list.length);
            for (let template of templates) {
                if (path.extname(template) === '.json')
                {
                    console.log(template);
                    let template_path = path.join('data/templates', template);
                    let template_data = JSON.parse(fs.readFileSync(template_path, {encoding: "utf8"}));
                    template_list.push(template_data);
                }
            }
        }
        catch (error) {
            alert(error);
        }
    }
    else if (platform === 'WEB') {
        // add later;
    }

    templates_select_list.innerHTML = '<option disabled selected value> -- Select Template -- </option>';
    for (let i in template_list)
    {
        if (template_list.hasOwnProperty(i))
        {
            let template_data = template_list[i];
            let template_option = document.createElement('option');
            template_option.value = i;
            template_option.innerText = template_data.name;
            templates_select_list.appendChild(template_option);
        }

    }
};

const create_attribute_test_frame = function(attribute_data, attribute_name) {
    let element = document.createElement('div');
    element.style.display = 'flex';
    element.style.flexDirection = 'row';
    element.id = 'attribute-test-frame:'+attribute_name;

    let elementName = document.createElement('div');
    elementName.innerText = attribute_data._name;
    element.appendChild(elementName);

    let elementValue;
    if (attribute_data._type === 'boolean')
    {
        elementValue = document.createElement('select');
        //elementValue.innerHTML = String(attribute_data._value);
        let elementValueTrue = document.createElement('option');
        elementValueTrue.value = 'true';
        elementValueTrue.innerText = 'true';
        //elementValueTrue.selected = attribute_data._value === true;
        elementValue.appendChild(elementValueTrue);
        let elementValueFalse = document.createElement('option');
        elementValueFalse.value = 'false';
        elementValueFalse.innerText = 'false';
        //elementValueFalse.selected = attribute_data._value === false;
        elementValue.appendChild(elementValueFalse);
        elementValue.value = attribute_data._value;
    }
    else if (attribute_data._type === 'array') {
        elementValue = document.createElement('fieldset');
        let elementValueLegend = document.createElement('legend');
        elementValueLegend.innerText = 'Choose options' +
            (attribute_data.hasOwnProperty('_choice_amount') ? ` (max. ${attribute_data._choice_amount})` : '');
        elementValue.appendChild(elementValueLegend);
        rerender_array_attribute(attribute_name, elementValue);
    }
    else {
        if (attribute_data.hasOwnProperty('_variants')) {
            elementValue = document.createElement('select');
            //elementValue.innerHTML = String(attribute_data._value);
            for (let variant of attribute_data._variants) {
                let elementValueOption = document.createElement('option');
                elementValueOption.value = variant;
                elementValueOption.innerText = variant;
                elementValue.appendChild(elementValueOption);
            }
        }
        else {
            elementValue = document.createElement('input');
            if (attribute_data._type === 'integer') {
                elementValue.type = 'number';
                if (attribute_data.hasOwnProperty('_value_min')) elementValue.min = attribute_data._value_min;
                if (attribute_data.hasOwnProperty('_value_max')) elementValue.max = attribute_data._value_max;
            }
            else {
                elementValue.type = 'text';
            }
            elementValue.value = attribute_data._value;
        }
    }
    elementValue.disabled = !attribute_data._set.includes('manual');
    if (!elementValue.disabled) elementValue.onchange = update_attribute_values;
    elementValue.id = 'attribute-test-frame:'+attribute_name+':value';
    element.appendChild(elementValue);

    let elementAttributeID = document.createElement('a');
    elementAttributeID.innerText = attribute_name;
    elementAttributeID.style = 'opacity: 0.5; font-size: 80%';
    elementAttributeID.title = attribute_data.hasOwnProperty('_effects') ? attribute_data._effects.map((value)=>(value.function.toString())).join('\n\n\n') : '(no effects)';
    elementAttributeID.addEventListener('click', ()=>{
        console.log(attribute_name+': '+(attribute_data.hasOwnProperty('_effects') ? attribute_data._effects.map((value)=>(value.function.toString())).join('\n\n\n') : '(no effects)'));
    })
    element.appendChild(elementAttributeID);

    return element;
};

const update_attributes_list = function() {
    // update attributes list after changing template.
    effect_execution_order = dices_engine.effect_ordering(attributes);
    attributes_frame.innerHTML = '';
    for (let attribute_name in attributes) {
        let attribute = attributes[attribute_name];
        attributes_frame.appendChild(create_attribute_test_frame(attribute, attribute_name));
    }
    update_attribute_values();
};

const rerender_array_attribute = function(attribute_name, value_element) {
    while (value_element.childElementCount > 1) value_element.removeChild(value_element.children[1]);
    let attribute_data = attributes[attribute_name];
    for (let i in attribute_data._variants) {
        if (attribute_data._variants.hasOwnProperty(i))
        {
            let variant = attribute_data._variants[i];
            let elementValueDiv = document.createElement('div');
            let elementValueInput = document.createElement('input');
            elementValueInput.id = 'attribute-test-frame:'+attribute_name+':value:checkbox'+i;
            elementValueInput.type = 'checkbox';
            elementValueInput.checked = (attribute_data._value.constructor === Array ? attribute_data._value.includes(variant) : false);
            elementValueInput.disabled = (!attribute_data._set.includes('manual'));
            if (attribute_data.hasOwnProperty('_choice_amount')) {
                if (!elementValueInput.checked && attribute_data._value.length >= attribute_data._choice_amount) elementValueInput.disabled = true;
            }
            elementValueDiv.appendChild(elementValueInput);
            let elementValueLabel = document.createElement('label');
            elementValueLabel.id = 'attribute-test-frame:'+attribute_name+':value:checkbox'+i+'label';
            elementValueLabel.htmlFor = elementValueInput.id;
            elementValueLabel.innerText = variant;
            elementValueDiv.appendChild(elementValueLabel);
            value_element.appendChild(elementValueDiv);
        }
    }
}

const reset_attribute_values = function() {
    // resets attribute values.
    // If set mode is AUTO, sets attribute properties to their default values. (see dices_engine.reset_attributes)
    // If set mode is MANUAL, sets attribute's value to set value in HTML input element. (see callback lower)
    dices_engine.reset_attributes(attributes, (attribute_name)=>{
        let attribute = attributes[attribute_name];
        if (attribute._type === 'array') {
            attribute._value = [];
            let elementValue = document.getElementById('attribute-test-frame:'+attribute_name+':value');
            for (let i = 0; i < elementValue.childElementCount-1; i++) {
                let elementValueInput = document.getElementById('attribute-test-frame:'+attribute_name+':value:checkbox'+i);
                let elementValueLabel = document.getElementById('attribute-test-frame:'+attribute_name+':value:checkbox'+i+'label');
                if (elementValueInput.checked) attribute._value.push(elementValueLabel.innerText);
            }
        }
        else {
            attribute._value = document.getElementById('attribute-test-frame:'+attribute_name+':value').value;
            if (attribute._type === 'boolean') attribute._value = attribute._value === 'true';
            else if (attribute._type === 'integer') attribute._value = Number(attribute._value);
        }
    });
};

const render_values = function() {
    for (let attribute_name in attributes) {
        if (attributes.hasOwnProperty(attribute_name)) {
            let value_element = document.getElementById('attribute-test-frame:'+attribute_name+':value');
            if (attributes[attribute_name]._type === 'array') {
                rerender_array_attribute(attribute_name, value_element);
            }
            else {
                value_element.value = attributes[attribute_name]._value;
            }
        }
    }
};

const update_attribute_values = function() {
    // call when some attribute were changed manually
    reset_attribute_values();
    dices_engine.execute_ordered_effects(attributes, effect_execution_order, dices_object);
    dices_engine.post_effect_attributes_cleanup();
    render_values();
};

const init = async function() {
    await update_templates_list();
};

console.log('Platform: '+platform);

const run = async function() {
    if (platform === 'NODE')
    {
        await init();
        nw.Window.get().show();
    }
};

run();