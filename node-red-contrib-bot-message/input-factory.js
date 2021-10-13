const CARD_CONST = require('./constants.js');

const buildCheckbox = () => {
    return;
};

const buildRadioButton = () => {
    return;
};

const buildTextblock = () => {
    return;
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