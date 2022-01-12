const CARD_CONST = require('./constants.js');

const buildCheckbox = (id, index, label, $data) => {
    return {
        id: `${id}_${CARD_CONST.TYPE_CHECKBOX}_${index}`,
        type: CARD_CONST.INPUT_CHOICESET,
        label,
        isMultiSelect: $data.isMultiSelect ? $data.isMultiSelect : true,
        value: $data.value ? $data.value : "1", // "1" means the first option of the checkbox
        choices: $data.choices
    };
};

const buildRadioButton = (id, index, label, $data) => {
    return {
        id: `${id}_${CARD_CONST.TYPE_RADIOBUTTON}_${index}`,
        type: CARD_CONST.INPUT_CHOICESET,
        label,
        style: CARD_CONST.STYLE_EXPANDED,
        value:  $data.value ? $data.value : "1", // "1" means the first option of the radio buttons
        choices: $data.choices
    };
};

const buildTextblock = (id, index, label) => {
    return {
        id: `${id}_${CARD_CONST.TYPE_TEXT}_${index}`,
        type: CARD_CONST.INPUT_TEXT,
        label,
        style: CARD_CONST.TYPE_TEXT,
        isMultiline: true
    };
};

const buildDropdown = (id, index, label, $data) => {
 return {
        id: `${id}_${CARD_CONST.TYPE_DROPDOWN}_${index}`,
        type: CARD_CONST.INPUT_CHOICESET,
        label,
        style: CARD_CONST.STYLE_COMPACT,
        value: $data.value ? $data.value : "1", // "1" means the first option of the dropdown list
        choices: $data.choices
    };
};

module.exports = {
    buildCheckbox,
    buildRadioButton,
    buildTextblock,
    buildDropdown
};