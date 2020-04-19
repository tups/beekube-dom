import DOMModule from './DOMModule';
import {cloneObject} from "../Helper/Object";

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
    DOMModule;
    states = {};

    /**
     *
     * @param {external:Node} element
     * @param {object} states
     */
    constructor(states, element) {

        this.states = Object.assign(this.states, states);
        this.DOMModule = new DOMModule(element, this.render(), this.states);
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
    set props (value) {
        let cloneStatesModule = cloneObject(this.states);
        //let cloneStatesModule = Object.assign({}, this.states);
        Object.assign(cloneStatesModule, value);
        // for(let nameProps in value) {
        //     if(value.hasOwnProperty(nameProps)) {
        //         if(cloneStatesModule.hasOwnProperty(nameProps)) {
        //             this.DOMModule.variables[nameProps] = value[nameProps];
        //         } else {
        //             console.log(value, cloneStatesModule, nameProps);
        //         }
        //
        //     }
        // }

        for(let nameProps in cloneStatesModule) {
            if(cloneStatesModule.hasOwnProperty(nameProps)) {
                this.DOMModule.variables[nameProps] = cloneStatesModule[nameProps];
            }
        }
        this.DOMModule.render();
    }

    get props () {
        return Object.assign({}, this.states);
    }

    render () {
        return [];
    }

    destroy () {

        // Remove All DOM
        if(!!this.DOMModule) {
            this.DOMModule.deleteDOM();
        }
        // Remove current Component
        delete this;
    }

}

export default Component;
