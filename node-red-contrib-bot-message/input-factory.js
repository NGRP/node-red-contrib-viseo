const CARD_CONST = require('./constants.js');

const buildCheckbox = (label, $data) => {
    return {
        id: `checkbox${new Date().getTime()}`,
        type: CARD_CONST.CHOICE_SET,
        label,
        isMultiSelect: $data.isMultiSelect ? $data.isMultiSelect : true,
        value: $data.value ? $data.value : "1",
        choices: $data.choices
    };
};

const buildRadioButton = (label, $data) => {
    return {
        id: `radiobutton${new Date().getTime()}`,
        type: CARD_CONST.CHOICE_SET,
        label,
        style: CARD_CONST.STYLE_EXPANDED,
        value: "1",
        choices: $data.choices
    };
};

const buildTextblock = (label) => {
    return {
        id: `textblock${new Date().getTime()}`,
        type: CARD_CONST.TEXT_BLOCK,
        label,
        style: "text",
        isMultiline: true
    };
};

const buildDropdown = (label, $data) => {
 return {
        id: `dropdown${new Date().getTime()}`,
        type: CARD_CONST.CHOICE_SET,
        label,
        style: CARD_CONST.STYLE_COMPACT,
        value: $data.value ? $data.value : "1",
        choices: $data.choices
    };
};

module.exports = {
    buildCheckbox,
    buildRadioButton,
    buildTextblock,
    buildDropdown
};