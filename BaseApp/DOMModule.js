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


function getAssignKeyTemplate(json, setKey = true) {
  var template = {};
  
  for (let dataKey in json) {
    if (json.hasOwnProperty(dataKey)) {
      let jsonData = json[dataKey];
      switch (typeof jsonData) {
        case 'object':
          if (setKey) {
            for (let elementType in jsonData) {
              let element = jsonData[elementType];
              const newKey = element.hasOwnProperty('key') ? element.key : `${elementType}-${dataKey}`;
              template[newKey] = {};
              template[newKey][elementType] = element;
              template[newKey] = getAssignKeyTemplate(template[newKey], false);
            }
          } else {
            switch (dataKey) {
              case 'class':
                template[dataKey] = jsonData;
                break;
              default:
                template[dataKey] = getAssignKeyTemplate(jsonData, dataKey === 'children');
                break;
            }
            
          }
          
          break;
        default:
          template[dataKey] = jsonData;
          break;
      }
    }
  }
  
  return template;
}

function assignVariableTemplate(context) {
  return reccursiveAssignVariables(context.template, context._variableRender, context, context.DOMElement, null);
}


function reccursiveAssignVariables(templateCurrent, templateRenderCurrent, context, DOMElementCurrent, elementParent = null) {
  
  let newTemplateArray = {};
  let DOMElement = DOMElementCurrent === null ? null : cloneObject(DOMElementCurrent);
  let template = cloneObject(templateCurrent);
  let templateRender = cloneObject(templateRenderCurrent);
  
  // On boucle sur la template JSON
  for (let elementIndex in templateRender) {
    if (templateRender.hasOwnProperty(elementIndex) && template.hasOwnProperty(elementIndex)) {
      // let newTemplate = JSON.parse(JSON.stringify(template[elementIndex]));
      
      let newTemplate = cloneObject(template[elementIndex]);
      newTemplateArray[elementIndex] = newTemplate;
      
      // Dans le cas d'un composant, on transmet le parent, et les propriétés
      
      if (typeof newTemplate === "function") {
        let element = null;
        if (elementParent === null) {
          if (DOMElement !== null) {
            element = DOMElement.DOM[elementIndex];
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
            if (DOMElement !== null) {
              element = DOMElement.DOM[elementIndex][elementName];
            } else {
              element = null;
            }
          } else {
            switch (true) {
              case elementName === "Component":
                element = elementParent[elementIndex];
                break;
              default:
                element = elementParent[elementIndex][elementName];
                break;
            }
          }
          
          
          let JSONElement = templateRender[elementIndex][elementName];
          let JSONElementTemplate = newTemplateArray[elementIndex][elementName];
          
          // On boucle sur les attributs de l'élément du DOM
          for (let attributeRender in JSONElement) {
            if (JSONElement.hasOwnProperty(attributeRender)) {
              let variableNames = JSONElement[attributeRender];
              let attributeTemplate = JSONElementTemplate[attributeRender];
              switch (attributeRender) {
                // On boucle sur les enfants pour créer aussi les variables
                case 'children':
                  newTemplateArray[elementIndex][elementName][attributeRender] = reccursiveAssignVariables(
                    attributeTemplate,
                    variableNames,
                    context,
                    !!element && element.hasOwnProperty('DOM') ? element : null,
                    !element ? null : element.children,
                  );
                  break;
                default:
                  newTemplateArray[elementIndex][elementName][attributeRender] = setVariable(
                    element && element.hasOwnProperty('DOM') ? element.DOM : element,
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
  // passe maintenant par autre part
  
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
  
  if (!Array.isArray(variablesName)) {
    if(typeof attributeValue === "function" && attributeName === "function") {
      setVariableOnComponent(
        attributeValue,
        element
      )
    }
    return attributeValue;
  };
  
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
      case 'value':
        element.value = getContentVariable(value);
        break;
      case 'function':
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
      context = updateTemplate(context, templateCompare.compare, templateCompare.template);
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
  
  let list = [...deleted, ...others];
  
  for (let diff in list) {
    if (list.hasOwnProperty(diff) && list[diff] instanceof Difference) {
      context = editTemplate(context, list[diff], template);
    }
  }
  
  return context;
}

/**
 *
 * @param context
 * @param diff
 * @param template
 */
function editTemplate(context, diff, template) {
  return updateValue(context, diff.get_path(), diff.get_right_value(), diff.get_left_value(), diff.get_type(), template);
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
      if (key === 'Component') {
        return TYPE_COMPONENT;
      } else {
        return TYPE_ELEMENT
      }
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
    case element instanceof Component:
      element.destroy();
      break;
    // Create DOM Element
    case element instanceof CreateElementDOM:
      if (element.hasOwnProperty('DOM')) {
        for (const indexChild in element.DOM) {
          const child = element.DOM[indexChild];
          if (child instanceof Component) {
            child.destroy();
          } else {
            for (let elementName in child) {
              if (child.hasOwnProperty(elementName) && child[elementName].hasOwnProperty('DOM')) {
                child[elementName].DOM.remove();
              }
            }
          }
        }
      }
      break;
    
    // DOM
    case !element.hasOwnProperty('DOM'):
      for (let elementName in element) {
        if (element.hasOwnProperty(elementName)) {
          if (element[elementName].hasOwnProperty('DOM') && element[elementName].DOM instanceof Element) {
            element[elementName].DOM.remove();
          }
        }
      }
      break;
    // String
    case typeof name === "string":
      if (element.DOM.hasOwnProperty(name)) {
        deleteChildElement(name, element.DOM[name]);
      } else {
        element.DOM.remove();
      }
      
      
      break;
    default:
      element['children'][name].DOM.remove();
      break;
  }
  
}

function updateValueInDOM(oldValue, value, typeDiff, name, typeIndex, element, parentElement, lastPathCurrentRight) {
  let elementDOM = !!element && element.hasOwnProperty('DOM') ? element.DOM : parentElement;
  
  let thisElement = !!element && element.hasOwnProperty(name) ? element[name] : element;
  // if (elementDOM === null) {
  //   for (const nameDOM in element) {
  //     elementDOM = element[nameDOM].DOM;
  //   }
  // }
  
  
  const REMOVE_OLD = typeDiff === Difference.TYPE_DELETED || typeDiff === Difference.TYPE_CHANGED;
  const ADD_NEW = typeDiff === Difference.TYPE_ADDED || typeDiff === Difference.TYPE_CHANGED;
  
  switch (typeIndex) {
    case TYPE_NODELIST:
      if (REMOVE_OLD) {
        
        for (const indexChild in element[name]) {
          const child = element[name][indexChild];
          // Suppression Ancienne éléments
          if (child instanceof CreateElementDOM) {
            child.destroy();
          } else {
            if (child.hasOwnProperty('DOM')) {
              child.DOM.remove();
            }
          }
        }
        element[name] = [];
        
      }
      
      // Création du nouvelle élément
      if (ADD_NEW) {
        element[name] = new CreateElementDOM(value, elementDOM);
      }
      
      break;
    
    case TYPE_ELEMENT:
      // Suppression de l'ancien élément
      
      if (REMOVE_OLD) {
        // Suppression Ancienne éléments
        deleteChildElement(name, thisElement);
        delete element[name];
      }
      
      // Création du nouvelle élément
      if (ADD_NEW) {
        let DOMJSON = {};
        DOMJSON[name] = value;
        const newElement = new CreateElementDOM(DOMJSON, elementDOM);
        element[name] = newElement.DOM[name];
      }
      
      break;
    case TYPE_COMPONENT:
      
      if(name === 'states') {
        element.setProps(value);
      } else {
        if (REMOVE_OLD) {
          deleteChildElement(name, thisElement);
          delete element[name];
        }
        // Création du nouvelle élément
        if (ADD_NEW) {
          let component = null;
          
          if (lastPathCurrentRight.hasOwnProperty(name)) {
            component = lastPathCurrentRight[name];
          }
          let DOMJSON = {};
          DOMJSON[name] = component;
          element[name] = new CreateElementDOM(DOMJSON, elementDOM, null, name);
        }
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
  
  return element;
}


function reccursiveUpdateValuePath(contextTemplate, template, currentDOM, paths, right_value, left_value, typeIndex, typeDiff, parentElement = null, lastKey = null) {
  
  let last = paths.length === 1;
  const currentPath = paths.slice();
  const keypath = currentPath.shift();
  switch (true) {
    case keypath === 'class':
    case typeIndex === TYPE_COMPONENT && contextTemplate.hasOwnProperty('states'):
      last = true;
      break;
  }
  let DOM = cloneObject(currentDOM);
  
  let currentContextTemplate = cloneObject(contextTemplate);
  let currentTemplate = cloneObject(template);
  const currentParentElement = DOM.hasOwnProperty('DOM') ? DOM.DOM : parentElement;
  
  
  const keyTypeElement = currentTemplate[keypath] !== "undefined" && typeof currentTemplate[keypath] === "object" && currentTemplate[keypath].hasOwnProperty('Component') ? 'Component' : keypath;
  typeIndex = incrementeType(typeIndex, keyTypeElement);
  
  
  // L'élement n'existe pas encore dans la template
  if (currentContextTemplate[keypath] === undefined && currentTemplate[keypath] === undefined) {
    if (typeDiff === Difference.TYPE_DELETED) {
      return {
        DOM,
        'contextTemplate': currentContextTemplate,
        'template': currentTemplate
      };
    } else {
      right_value = keypath === 'children' ? getAssignKeyTemplate([right_value], true) : right_value;
      DOM = updateValueInDOM(left_value, right_value, typeDiff, keypath, typeIndex, DOM, parentElement, currentTemplate, lastKey);
      currentTemplate[keypath] = right_value;
    }
  } else {
    
    
    if (last) {
      
      switch (true) {
        case keypath === 'states':
          DOM = updateValueInDOM(currentContextTemplate[keypath], currentTemplate[keypath], typeDiff, keypath, typeIndex, DOM, parentElement, currentTemplate, lastKey);
          currentContextTemplate[keypath] = currentTemplate[keypath];
          break;
        case typeDiff === Difference.TYPE_DELETED:
          DOM = updateValueInDOM(left_value, right_value, typeDiff, keypath, typeIndex, DOM, parentElement, currentTemplate, lastKey);
          switch (keypath) {
            case 'class':
              const keyclass = currentPath.shift();
              if (currentContextTemplate.hasOwnProperty(keypath)) {
                if (typeof currentContextTemplate[keypath] === 'string') {
                  currentContextTemplate[keypath] = currentContextTemplate[keypath].replace(left_value, '');
                }
                if (Array.isArray(currentContextTemplate[keypath])) {
                  currentContextTemplate[keypath].hasOwnProperty(keyclass) ? delete currentContextTemplate[keypath][keyclass] : '';
                }
              }
              
              break;
            default:
              delete currentContextTemplate[keypath];
              break;
          }
          break;
        default:
          DOM = updateValueInDOM(left_value, right_value, typeDiff, keypath, typeIndex, DOM, parentElement, currentTemplate, lastKey);
          currentContextTemplate[keypath] = right_value;
          break;
      }
      
      
    } else {
      
      if (DOM.hasOwnProperty(keypath)) {
        currentDOM = DOM[keypath];
      }
      const dataChild = reccursiveUpdateValuePath(currentContextTemplate[keypath], currentTemplate[keypath], currentDOM, currentPath, right_value, left_value, typeIndex, typeDiff, currentParentElement, lastKey);
      DOM[keypath] = dataChild.DOM;
      currentContextTemplate[keypath] = dataChild.contextTemplate;
      currentTemplate[keypath] = dataChild.template;
      
    }
    
  }
  
  return {
    DOM,
    'contextTemplate': currentContextTemplate,
    'template': currentTemplate
  }
  
}

function updateValue(context, paths, right_value, left_value, typeDiff, template) {
  
  const data = reccursiveUpdateValuePath(context.template, template, context.DOMElement.DOM, paths, right_value, left_value, TYPE_NODELIST, typeDiff, context.parentNode);
  
  context.template = data.contextTemplate;
  context.DOMElement.DOM = data.DOM;
  template = data.template;
  
  // for (i = 0; i < paths.length; ++i) {
  //   last = (i + 1) === paths.length;
  //
  //   const keyTypeElement = current[paths[i]] !== "undefined" && typeof current[paths[i]] === "object" && current[paths[i]].hasOwnProperty('Component') ? 'Component' : paths[i];
  //
  //   typeIndex = incrementeType(typeIndex, keyTypeElement);
  //
  //
  //   // On récupére l'index si c'est un composant
  //   if (typeIndex === TYPE_COMPONENT && componentIndex === null) {
  //     componentIndex = lastPathIndex;
  //   }
  //
  //   if (current[paths[i]] === undefined) {
  //     if (typeDiff === Difference.TYPE_DELETED) {
  //       return false;
  //     } else {
  //       updateValueInDOM(left_value, right_value, typeDiff, lastPathIndex, typeIndex, currentElement, lastPathCurrent, lastPathCurrentRight, componentIndex);
  //       if (current === Object(current)) {
  //         current[paths[i]] = right_value;
  //       }
  //     }
  //
  //
  //   } else {
  //     current = current[paths[i]];
  //     currentRight = currentRight[paths[i]];
  //
  //     if (currentDOM.hasOwnProperty(paths[i])) {
  //       currentDOM = currentDOM[paths[i]]
  //     }
  //
  //     if (typeIndex === TYPE_ATTRIBUTE || (typeIndex === TYPE_COMPONENT) || (typeIndex === TYPE_ELEMENT)) {
  //       currentElement = currentDOM;
  //     }
  //
  //     if (last) {
  //       if (typeDiff === Difference.TYPE_DELETED) {
  //         updateValueInDOM(left_value, right_value, typeDiff, lastPathIndex, typeIndex, currentElement, lastPathCurrent, lastPathCurrentRight, componentIndex);
  //       } else {
  //         updateValueInDOM(left_value, right_value, typeDiff, lastPathIndex, typeIndex, currentElement, lastPathCurrent, lastPathCurrentRight, componentIndex);
  //         if (typeIndex !== TYPE_ATTRIBUTE_LIST) {
  //           if (current === Object(current)) {
  //             current[paths[i]] = right_value;
  //           }
  //         }
  //       }
  //     }
  //     lastPathCurrent = current;
  //     lastPathCurrentRight = currentRight;
  //     lastPathIndex = paths[i];
  //   }
  //
  //   lastPath = paths[i];
  // }
  
  return context;
}

/**
 *
 * @param DOM
 */
function deleteReccursiveDOM(DOM) {
  for (const index in DOM) {
    const element = DOM[index];
    for (let name in element) {
      if (element[name].hasOwnProperty('DOM')) {
        element[name].DOM.remove();
      }
    }
  }
}

DOMModule.prototype.deleteDOM = function () {
  if (this.DOMElement.DOM !== null) {
    this.DOMElement.removeEvent();
    deleteReccursiveDOM(this.DOMElement.DOM);
  }
};

export default DOMModule;
export {getAssignKeyTemplate};
