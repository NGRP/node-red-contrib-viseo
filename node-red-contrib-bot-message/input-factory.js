const CARD_CONST = require('./constants.js');

const buildCheckbox = (label, $data) => {
    // "isMultiSelect": true,
    return {
        type: CARD_CONST.CHOICE_SET,
        label,
        isMultiSelect: $data.isMultiSelect ? $data.isMultiSelect : true,
        value: "1",
        choices: [
            {
                $data,
                title: "${choice}",
                value: "${value}"
            }
        ]
    };
};

const buildRadioButton = (label, $data) => {
    return {
        type: CARD_CONST.CHOICE_SET,
        label,
        style: "expanded",
        value: "1",
        choices: [
            {
                $data,
                title: "${choice}",
                value: "${value}"
            }
        ]
    };
};

const buildTextblock = (label) => {
    return {
        type: "Input.Text",
        label,
        style: "text"
    };
};

const buildDropdown = (label, $data) => {
 return {
        type: CARD_CONST.CHOICE_SET,
        label,
        style: "compact",
        value: "1",
        choices: [
            {
                $data,
                title: "${choice}",
                value: "${value}"
            }
        ]
    };
};

module.exports = {
    buildCheckbox,
    buildRadioButton,
    buildTextblock,
    buildDropdown
};