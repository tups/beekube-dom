import CreateElementDOM from '../DOM';
import {cloneObject} from '../Helper/Object';
import {getContentVariable} from "../Helper/String";
import {Difference} from "js-struct-compare";
import Component from "./Component";

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

    let parentNodeOption = Object.assign({
        parentNode: null,
        index: null
    }, parentNode);

    this.template = template;
    this.parentNode = parentNodeOption.parentNode;
    this.nodeIndex = parentNodeOption.index;
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
                                        !element ? null : element.children,
                                    );
                                    break;
                                default:
                                    newTemplate[elementName][attributeRender] = setVariable(
                                        !element ? element : element.DOM,
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
            switch (typeof context.variables[nameVariable]) {
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
                if (element.hasAttribute(attributeName) && typeof element.hasAttribute(attributeName) === 'string') {
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
 * @param templateCompare {'compare': Difference[], template: {}}
 */
DOMModule.prototype.render = function (context = null, templateCompare = null) {
    context = context === null ? this : context;

    if (templateCompare !== null) {
        if (templateCompare.hasOwnProperty('compare') && templateCompare.hasOwnProperty('template')) {
            updateTemplate(context, templateCompare.compare, templateCompare.template);
            this.getTemplateVariables(); // Mise à jour des données sur les variables
        }
    }

    let templateWithVariables = assignVariableTemplate(context);
    if (context.DOMElement === null) {
        context.DOMElement = new CreateElementDOM(templateWithVariables, context.parentNode, null, context.nodeIndex);
    }

};


function filterDeleted(value) {
    return value.get_type() === Difference.TYPE_DELETED;
}

function filterOther(value) {
    return value.get_type() !== Difference.TYPE_DELETED;
}

/**
 *
 * @param context
 * @param diffenrenceList Difference[]
 * @param template object
 */
function updateTemplate(context, diffenrenceList, template) {

    let deleted = diffenrenceList.filter(filterDeleted);
    let others = diffenrenceList.filter(filterOther);

    let list = deleted.concat(others);
    for (let diff in list) {
        if (diffenrenceList.hasOwnProperty(diff) && diffenrenceList[diff] instanceof Difference) {
            editTemplate(context, diffenrenceList[diff], template);
        }
    }
}

/**
 *
 * @param context
 * @param diff
 * @param template
 */
function editTemplate(context, diff, template) {
    updateValue(context, diff.get_path(), diff.get_right_value(), diff.get_left_value(), diff.get_type(), template);
}

const TYPE_NODELIST = 1;
const TYPE_ELEMENT = 2;
const TYPE_ATTRIBUTE = 3;
const TYPE_ATTRIBUTE_LIST = 4;
const TYPE_COMPONENT = 5;

/**
 *
 * @param type
 * @param key
 * @returns {number}
 */
function incrementeType(type, key) {
    switch (type) {
        case TYPE_NODELIST:
            return TYPE_ELEMENT;
        case TYPE_ELEMENT:
            if (key === 'Component') {
                return TYPE_COMPONENT;
            } else {
                return TYPE_ATTRIBUTE
            }
        case TYPE_ATTRIBUTE:
            if (key === 'children') {
                return TYPE_NODELIST;
            }

            if (key === 'class') {
                return TYPE_ATTRIBUTE_LIST;
            }

            return TYPE_ATTRIBUTE;

        case TYPE_ATTRIBUTE_LIST:
            return TYPE_ATTRIBUTE_LIST;
        case TYPE_COMPONENT:
            return TYPE_COMPONENT;
    }
    return TYPE_NODELIST;
}

function deleteChildElement(name, element) {

    switch (true) {
        // Composant
        case element['children'][name] instanceof Component:
            element['children'][name].destroy();
            break;
        // Create DOM Element
        case element['children'][name] instanceof CreateElementDOM:
            if (element['children'][name].hasOwnProperty('DOM')) {
                element['children'][name].DOM.forEach(function (child) {
                    if (child instanceof Component) {
                        child.destroy();
                    } else {
                        for (let elementName in child) {
                            if (child.hasOwnProperty(elementName) && child[elementName].hasOwnProperty('DOM')) {
                                child[elementName].DOM.remove();
                            }
                        }
                    }
                });
            }
            break;
        // String
        case typeof name === "string":
            element.DOM.remove();
            break;
        // DOM
        case !element['children'][name].hasOwnProperty('DOM'):
            for (let elementName in element['children'][name]) {
                if(element['children'][name].hasOwnProperty(elementName)) {
                    if (element['children'][name][elementName].hasOwnProperty('DOM')) {
                        element['children'][name][elementName].DOM.remove();
                    }
                }
            }
            break;
        default:
            element['children'][name].DOM.remove();
            break;
    }

}

function updateValueInDOM(oldValue, value, typeDiff, name, typeIndex, element, parentTemplate, lastPathCurrentRight, componentindex) {
    let elementDOM = !!element && element.hasOwnProperty('DOM') ? element.DOM : {};

    const REMOVE_OLD = typeDiff === Difference.TYPE_DELETED || typeDiff === Difference.TYPE_CHANGED;
    const ADD_NEW = typeDiff === Difference.TYPE_ADDED || typeDiff === Difference.TYPE_CHANGED;

    switch (typeIndex) {
        case TYPE_NODELIST:
            if (REMOVE_OLD) {
                if (Array.isArray(element[name])) {
                    element[name].forEach(function (child) {
                        // Suppression Ancienne éléments
                        if (child instanceof CreateElementDOM) {
                            child.destroy();
                        } else {
                            if (child.hasOwnProperty('DOM')) {
                                child.DOM.remove();
                            }
                        }
                    });

                    element[name] = [];
                }
            }

            // Création du nouvelle élément
            if (ADD_NEW) {
                element[name] = new CreateElementDOM(value, elementDOM);
            }

            break;

        case TYPE_ELEMENT:
            // sécurité sur la clé children
            if (!element.hasOwnProperty('children')) element['children'] = [];

            // Suppression de l'ancien élément
            if (REMOVE_OLD) {
                // Suppression Ancienne éléments
                deleteChildElement(name, element);
            }

            // Création du nouvelle élément
            if (ADD_NEW) {
                element['children'][name] = new CreateElementDOM([value], elementDOM);
            }

            break;
        case TYPE_COMPONENT:

            if (REMOVE_OLD) {
                deleteChildElement(componentindex, element);
            }
            // Création du nouvelle élément
            if (ADD_NEW) {
                let component = null;
                if (lastPathCurrentRight.hasOwnProperty('Component')) {
                    component = lastPathCurrentRight;
                } else {
                    component = {'Component': lastPathCurrentRight};
                }

                element['children'][componentindex] = new CreateElementDOM([component], elementDOM, null, componentindex);
            }

            break;
        case TYPE_ATTRIBUTE:
            switch (name) {
                case 'children':
                    break;
                default:
                    switch (name) {
                        case 'class':
                            if (REMOVE_OLD) {
                                elementDOM.classList.remove(oldValue);
                            }
                            if (ADD_NEW) {
                                elementDOM.classList.add(value);
                            }
                            break;
                        case 'textContent':
                            if (REMOVE_OLD) {
                                elementDOM.textContent = '';
                            }
                            if (ADD_NEW) {
                                elementDOM.textContent = value;
                            }
                            break;
                        case 'innerHTML':
                            if (REMOVE_OLD) {
                                elementDOM.innerHTML = '';
                            }
                            if (ADD_NEW) {
                                elementDOM.innerHTML = value;
                            }
                            break;
                        default:
                            if (REMOVE_OLD) {
                                elementDOM.removeAttribute(name);
                            }
                            if (ADD_NEW) {
                                elementDOM.setAttribute(name, value);
                            }
                            break;
                    }
                    break;
            }
            break;
        case TYPE_ATTRIBUTE_LIST:
            switch (name) {
                case 'class':
                    if (REMOVE_OLD) {
                        elementDOM.classList.remove(oldValue);
                    }
                    if (ADD_NEW) {
                        elementDOM.classList.add(value);
                    }
                    break;
                default:
                    break;
            }
            break;
    }

}


function updateValue(context, paths, right_value, left_value, typeDiff, template) {
    let current = context.template,
        currentRight = template,
        i,
        last = false,
        lastPath = null,
        currentDOM = context.DOMElement.DOM,
        typeIndex = TYPE_NODELIST,
        currentElement = null,
        lastPathCurrent = undefined,
        lastPathCurrentRight = undefined,
        lastPathIndex,
        componentIndex = null;


    for (i = 0; i < paths.length; ++i) {
        last = (i + 1) === paths.length;
        typeIndex = incrementeType(typeIndex, paths[i]);

        let pathUpdate = ( (typeIndex === TYPE_ATTRIBUTE_LIST) || (typeIndex === TYPE_COMPONENT) ? lastPath : paths[i] );

        // On récupére l'index si c'est un composant
        if (typeIndex === TYPE_COMPONENT && componentIndex === null) {
            componentIndex = lastPathIndex;
        }

        if (current[paths[i]] === undefined) {
            if (typeDiff === Difference.TYPE_DELETED) {
                return false;
            } else {
                updateValueInDOM(left_value, right_value, typeDiff, pathUpdate, typeIndex, currentElement, lastPathCurrent, lastPathCurrentRight, componentIndex);
                if (current === Object(current)) {
                    current[paths[i]] = right_value;
                }
            }


        } else {
            current = current[paths[i]];
            currentRight = currentRight[paths[i]];

            if (currentDOM.hasOwnProperty(paths[i])) {
                currentDOM = currentDOM[paths[i]]
            }

            if (typeIndex === TYPE_ATTRIBUTE) {
                currentElement = currentDOM;
            }

            if (last) {
                if (typeDiff === Difference.TYPE_DELETED) {
                    if(typeIndex === TYPE_ATTRIBUTE) {
                        typeIndex = TYPE_ELEMENT;
                    }
                    updateValueInDOM(left_value, right_value, typeDiff, pathUpdate, typeIndex, currentElement, lastPathCurrent, lastPathCurrentRight, componentIndex);
                } else {
                    updateValueInDOM(left_value, right_value, typeDiff, pathUpdate, typeIndex, currentElement, lastPathCurrent, lastPathCurrentRight, componentIndex);
                    if (typeIndex !== TYPE_ATTRIBUTE_LIST) {
                        if (current === Object(current)) {
                            current[paths[i]] = right_value;
                        }
                    }
                }
            }
            lastPathCurrent = current;
            lastPathCurrentRight = currentRight;
            lastPathIndex = paths[i];
        }

        lastPath = paths[i];
    }
    return current;
}

/**
 *
 * @param DOM
 */
function deleteReccursiveDOM(DOM) {
    if (Array.isArray(DOM)) {
        DOM.forEach(function (element) {
            for (let name in element) {
                if (element[name].hasOwnProperty('DOM')) {
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