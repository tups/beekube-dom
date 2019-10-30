import {getContentVariable} from "./Helper/String";

/**
 * Créer un élement DOM en JSON
 * Et créer les évenements si nécessaire
 * @param dataJson object
 * @param parentElement element
 * @constructor
 *
 * * Voici un exemple de template :
 * [{
        'p': {
            'textContent': 'Remplir le formulaire ci-dessous'
        },
    }, {
        'div': {
            'children': [
                {
                    "label": {
                        "textContent": "Nom"
                    },
                    "input": {
                        "type": "text",
                        "value": "",
                        "change": {
                            'listener': this.onChange,
                            'useCapture': false
                        },
                        "keyup": this.onChange
                    }
                }
            ]
        }
        }]
 *
 */
function CreateElementDOM(dataJson, parentElement) {
    parentElement = typeof parentElement === "undefined" ? null : parentElement;

    this.event = [];
    this.DOM = [];

    let _this = this;
    dataJson.forEach(function (element) {
        let thisDOM = {};

        if (typeof element === "function") {
            let thisComponent = new element(parentElement);
            _this.DOM.push(thisComponent);
            return true;
        }

        for (let typeElement in element) {
            if (element.hasOwnProperty(typeElement)) {
                let elem = document.createElement(typeElement);

                thisDOM[typeElement] = {
                    'DOM': elem
                };

                let elemJSON = element[typeElement];
                for (let attribute in elemJSON) {
                    if (elemJSON.hasOwnProperty(attribute)) {
                        switch (attribute) {
                            case 'children':
                                let children = new CreateElementDOM(elemJSON[attribute], elem);
                                _this.event.concat(children.event);
                                thisDOM[typeElement] = {
                                    'children': children.DOM
                                };
                                break;
                            case 'textContent':
                                elem.textContent = getContentVariable(elemJSON[attribute]);
                                break;
                            default:
                                _this.event.concat(
                                    setAttribute(elem, attribute, elemJSON[attribute])
                                );
                                break;
                        }
                    }
                }

                if (!!parentElement) {
                    parentElement.appendChild(elem);
                }
            }
        }

        _this.DOM.push(thisDOM);
    });
}

CreateElementDOM.prototype.removeEvent = function () {
    this.event.forEach(function (event) {
        let element = event.element;
        if (element.removeEventListener) {
            element.removeEventListener(event.type, event.listener, event.options);
        }
    });
};

/**
 * SetAttribute element and return event
 * @param element
 * @param attributeName
 * @param attributeValue
 * @returns {Array}
 */
function setAttribute(element, attributeName, attributeValue) {

    let event = [];

    switch (typeof attributeValue) {

        case 'string':
            element.setAttribute(attributeName, attributeValue);
            break;

        case 'function':
            element.addEventListener(attributeName, attributeValue, false);
            break;

        case 'object':
            let listener = attributeValue.hasOwnProperty('listener') ? attributeValue.listener : function () {
            };
            let useCapture = attributeValue.hasOwnProperty('useCapture') ? attributeValue.useCapture : null;
            let options = false;

            if (useCapture === null) {
                options = attributeValue.hasOwnProperty('options') ? attributeValue.options : false;
            }

            element.addEventListener(attributeName, listener, options);

            event.push({
                'element': element,
                'type': attributeName,
                'listener': listener,
                'options': options
            });

            break;

        default:
            break;
    }

    return event;
}

export default CreateElementDOM;
