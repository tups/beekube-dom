import DOMModule, {getAssignKeyTemplate} from './DOMModule';
import {cloneObject} from "../Helper/Object";
import compare from "js-struct-compare";


/**
 * A node in the DOM tree.
 *
 * @external Node
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Node Node}
 */

/**
 * Composent, permet de générer un template à partir d'un JSON qu'il faut retourner dans la fonction "render"
 *
 */
class Component {
    DOMModule = null;
    states = {};
    
    /**
     *
     * @param {external:Node} element
     * @param {object} states
     * @param index int|null
     */
    constructor(states, element, index = null) {
        
        this.states = Object.assign(this.states, states);
        this.renderTemplate = getAssignKeyTemplate(this.render());
        this.DOMModule = new DOMModule({
            parentNode: element,
            index: index
        }, this.renderTemplate, this.states);
    }
    
    getProp(variable, index) {
        let prop = function () {
            return (typeof index !== "undefined" ? this.props[variable][index] : this.props[variable]);
        };
        return prop.bind(this);
    }
    
    /**
     *
     * @param value Object
     */
    set props(value) {
        let cloneStatesModule = cloneObject(this.states);
        Object.assign(cloneStatesModule, value);
        
        for (let nameProps in cloneStatesModule) {
            if (cloneStatesModule.hasOwnProperty(nameProps)) {
                this.DOMModule.variables[nameProps] = cloneStatesModule[nameProps];
            }
        }
        
        let thisRender = getAssignKeyTemplate(this.render());
        let templateCompare = compare(this.renderTemplate, thisRender);
        this.renderTemplate = thisRender;
        
        this.DOMModule.render(null, {'compare': templateCompare, 'template': thisRender});
    }
    
    get props() {
        return Object.assign({}, this.states);
    }
    
    render() {
        return [];
    }
    
    beforeDestroy() {
    
    }
    
    destroy() {
        
        this.beforeDestroy();
        
        // Remove All DOM
        if (!!this.DOMModule) {
            this.DOMModule.deleteDOM();
        }
        // Remove current Component
        delete this;
    }
    
    setProps(states) {
        this.props = states;
    }
    
}

export default Component;
