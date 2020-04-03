import CreateElementDOM from '../DOM';
import {cloneObject} from '../Helper/Object';
import {getContentVariable} from "../Helper/String";

/**
 * Permet de générer du DOM HTML à partir d'une template JSON
 * Les événements sont pris également en compte et appliquer
 * Le paramètre parent indique dans quel élement du DOM, il sera insérer
 *
 * Les Variables sont une simple JSON (nom, valeur), exemple : {"name": "Damien"}
 *
 * Voici un exemple de template :
 * [{
        'p': {
            'textContent': 'Bonjour {{name}}'
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
                        "value": "{{name}}",
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
 */
function DOMModule(parentNode, template, variables) {
    this.template = template;
    this.parentNode = parentNode;
    this.variables = variables;
    this.DOMElement = null;

    this.getTemplateVariables();
    this.render();
}

DOMModule.prototype.getTemplateVariables = function () {
    this._variableRender = getVariableInJSONTemplate(this.template);
};

const regexVariable = /\{\{(.*?)\}\}/gm;

function getVariableInJSONTemplate(json) {
    var JSONVariable = {};

    for (let dataKey in json) {
        if (json.hasOwnProperty(dataKey)) {
            let jsonData = json[dataKey];
            switch (typeof jsonData) {
                case 'object':
                    JSONVariable[dataKey] = getVariableInJSONTemplate(jsonData);
                    break;
                case 'function':
                    JSONVariable[dataKey] = jsonData;
                    break;
                case 'string':
                    let m;
                    while ((m = regexVariable.exec(jsonData)) !== null) {
                        // This is necessary to avoid infinite loops with zero-width matches
                        if (m.index === regexVariable.lastIndex) {
                            regexVariable.lastIndex++;
                        }

                        if (!JSONVariable.hasOwnProperty(dataKey)) {
                            JSONVariable[dataKey] = [];
                        }

                        JSONVariable[dataKey].push(m[1]);
                    }

                    break;
                default:
                    break;
            }
        }
    }

    return JSONVariable;
}

function assignVariableTemplate(context) {
    return reccursiveAssignVariables(context.template, context._variableRender, context, null);
}


function reccursiveAssignVariables(template, templateRender, context, elementParent = null) {

    let newTemplateArray = [];
    // On boucle sur la template JSON
    for (let elementIndex in templateRender) {
        if (templateRender.hasOwnProperty(elementIndex) && template.hasOwnProperty(elementIndex)) {
            // let newTemplate = JSON.parse(JSON.stringify(template[elementIndex]));

            let newTemplate = cloneObject(template[elementIndex]);
            newTemplateArray.push(newTemplate);

            // Dans le cas d'un composant, on transmet le parent, et les propriétés
            if (typeof newTemplate === "function") {
                let element = null;
                if (elementParent === null) {
                    if (context.DOMElement !== null) {
                        element = context.DOMElement.DOM[elementIndex];
                    } else {
                        element = null;
                    }
                } else {
                    element = elementParent[elementIndex];
                }
                setVariableOnComponent(
                    element,
                    context
                )
            }

            // On boucle sur les élements DOM
            for (let elementName in templateRender[elementIndex]) {
                if (templateRender[elementIndex].hasOwnProperty(elementName)) {
                    // On cherche l'element du DOM existant dans la page
                    // Dans le cas contraire on met null sur element
                    let element = null;
                    if (elementParent === null) {
                        if (context.DOMElement !== null) {
                            element = context.DOMElement.DOM[elementIndex][elementName];
                        } else {
                            element = null;
                        }
                    } else {
                        element = elementParent[elementIndex][elementName];
                    }


                    let JSONElement = templateRender[elementIndex][elementName];
                    let JSONElementTemplate = newTemplate[elementName];

                    // On boucle sur les attributs de l'élément du DOM
                    for (let attributeRender in JSONElement) {
                        if (JSONElement.hasOwnProperty(attributeRender)) {
                            let variableNames = JSONElement[attributeRender];
                            let attributeTemplate = JSONElementTemplate[attributeRender];
                            switch (attributeRender) {
                                // On boucle sur les enfants pour créer aussi les variables
                                case 'children':
                                    newTemplate[elementName][attributeRender] = reccursiveAssignVariables(
                                        attributeTemplate,
                                        variableNames,
                                        context,
                                        element === null ? element : element.children,
                                    );
                                    break;
                                default:
                                    newTemplate[elementName][attributeRender] = setVariable(
                                        element === null ? element : element.DOM,
                                        attributeRender,
                                        attributeTemplate,
                                        variableNames,
                                        context);
                                    break;
                            }
                        }
                    }
                }
            }
        }
    }

    return newTemplateArray;
}

const SET_VARIABLE_STRING = 1;
const SET_VARIABLE_DOM = 2;

/**
 * Transmettre les propriétés au Composent enfant
 * @param component
 * @param context
 */
function setVariableOnComponent(component, context) {
    if (component !== null) {
        component.props = Object.assign({}, context.variables);
    }

}

/**
 * Changement proprement les variables
 * Si le DOM existe, seulement changer la valeur nécessaire pour éviter de reconstruire le DOM
 * @param element
 * @param attributeName
 * @param attributeValue
 * @param variablesName
 * @param context
 * @returns {*}
 */
function setVariable(element, attributeName, attributeValue, variablesName, context) {
    let type = element === null ? SET_VARIABLE_STRING : SET_VARIABLE_DOM;
    let value = attributeValue;


    if (!Array.isArray(variablesName)) return attributeValue;

    variablesName.forEach(function (nameVariable) {
        if (context.variables.hasOwnProperty(nameVariable)) {
            let variableValue = '';
            // On vérifie si la valeur est une function
            // Si oui, on l'execute
            switch(typeof context.variables[nameVariable]) {
                case 'function':
                    variableValue = context.variables[nameVariable]();
                    break;
                default:
                    variableValue = context.variables[nameVariable];
                    break;
            }

            // Sécurité pour les valeurs null, car le remplace parse le null en string
            variableValue = variableValue === null ? '' : variableValue;

            // Changer le tag par la valeur
            value = value.replace('{{' + nameVariable + '}}', variableValue);
        }
    });
    if (type === SET_VARIABLE_DOM) {
        switch (attributeName) {
            case 'textContent':
                element.textContent = getContentVariable(value);
                break;
            default:
                element.setAttribute(attributeName, value);
                if (element.hasAttribute(attributeName)) {
                    element[attributeName] = value;
                }
                break;
        }
    }

    return value;
}

/**
 * Rendu de la template
 * @param context
 */
DOMModule.prototype.render = function (context = null) {
    context = context === null ? this : context;
    let templateWithVariables = assignVariableTemplate(context);
    if (context.DOMElement === null) {
        context.DOMElement = new CreateElementDOM(templateWithVariables, context.parentNode);
    }

};

function deleteReccursiveDOM(DOM) {
    if(Array.isArray(DOM)) {
        DOM.forEach(function (element) {
            for(let name in element) {
                if(element[name].hasOwnProperty('DOM')) {
                    element[name].DOM.remove();
                }
            }
        });
    }
}

DOMModule.prototype.deleteDOM = function () {
    if (this.DOMElement.DOM !== null) {
        this.DOMElement.removeEvent();
        deleteReccursiveDOM(this.DOMElement.DOM);
    }
};

export default DOMModule;