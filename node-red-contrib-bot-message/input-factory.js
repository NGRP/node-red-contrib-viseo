const CARD_CONST = require('./constants.js');

const buildCheckbox = (id, index, label, $data) => {
    return {
        id: `${id}_${CARD_CONST.TYPE_CHECKBOX}_${index}`,
        type: CARD_CONST.INPUT_CHOICESET,
        label,
        isMultiSelect: $data.isMultiSelect ? $data.isMultiSelect : true,
        value: $data.value ? $data.value : "1", // "1" means the first option of the checkbox
        choices: $data.choices,
        isRequired: $data.isRequired ? $data.isRequired : false,
        errorMessage: $data.errorMessage ? $data.errorMessage : ''
    };
};

const buildRadioButton = (id, index, label, $data) => {
    return {
        id: `${id}_${CARD_CONST.TYPE_RADIOBUTTON}_${index}`,
        type: CARD_CONST.INPUT_CHOICESET,
        label,
        style: CARD_CONST.STYLE_EXPANDED,
        value:  $data.value ? $data.value : "1", // "1" means the first option of the radio buttons
        choices: $data.choices,
        isRequired: $data.isRequired ? $data.isRequired : false,
        errorMessage: $data.errorMessage ? $data.errorMessage : ''
    };
};

/**
 * Build a text input block, refer to MS doc for more infomation about schema https://adaptivecards.io/explorer/Input.Text.html
 * @param {*} id ID of the card where the text input is
 * @param {*} index index for this input. The first text input is of index 1
 * @param {*} label label for this input
 * @param {*} $data data sample for this input
 * @returns an object this text input used for payload body
 */
const buildTextblock = (id, index, label, $data) => {
    const commonProps = {
        id: `${id}_${CARD_CONST.TYPE_TEXT}_${index}`,
        type: CARD_CONST.INPUT_TEXT,
        label,
        style: $data.style ? $data.style : CARD_CONST.TYPE_TEXT, // Possible values are : text, tel, email.
        isMultiline: $data.isMultiline ? $data.isMultiline : false,
        isRequired: $data.isRequired ? $data.isRequired : false,
        errorMessage: $data.errorMessage ? $data.errorMessage : ''
    };
    if ($data.regex) {
        return {
            ...commonProps,
            regex: $data.regex
        };
    }
    return commonProps;
};

const buildDropdown = (id, index, label, $data) => {
 return {
        id: `${id}_${CARD_CONST.TYPE_DROPDOWN}_${index}`,
        type: CARD_CONST.INPUT_CHOICESET,
        label,
        style: CARD_CONST.STYLE_COMPACT,
        value: $data.value ? $data.value : "1", // "1" means the first option of the dropdown list
        choices: $data.choices,
        isRequired: $data.isRequired ? $data.isRequired : false,
        errorMessage: $data.errorMessage ? $data.errorMessage : ''
    };
};

module.exports = {
    buildCheckbox,
    buildRadioButton,
    buildTextblock,
    buildDropdown
};