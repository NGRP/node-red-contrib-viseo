const CARD_CONST = require('./constants.js');

const buildCheckbox = (label, choices) => {
    // "isMultiSelect": true,
    return {
        type: CARD_CONST.CHOICE_SET,
        label,
        isMultiSelect: $data.isMultiSelect ? $data.isMultiSelect : true,
        value: "1",
        choices
    };
};

const buildRadioButton = (label, choices) => {
    return {
        type: CARD_CONST.CHOICE_SET,
        label,
        style: "expanded",
        value: "1",
        choices
    };
};

const buildTextblock = (label) => {
    return {
        type: "Input.Text",
        label,
        style: "text"
    };
};

const buildDropdown = (label, choices) => {
 return {
        type: CARD_CONST.CHOICE_SET,
        label,
        style: "compact",
        value: "1",
        choices
    };
};

module.exports = {
    buildCheckbox,
    buildRadioButton,
    buildTextblock,
    buildDropdown
};