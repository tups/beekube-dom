
function BEM(module) {
    const core = {
        'separateur' : {
            'element': '__',
            'modifier': '--'
        },
        getClass: function (module, type, args) {

            if (!args.hasOwnProperty('element') || typeof args.element === "undefined") {
                args.element = null;
            }
            if (!args.hasOwnProperty('modifier') || typeof args.modifier === "undefined") {
                args.modifier = null;
            }

            switch (type) {
                case 'block':
                    return module;
                    break;
                case 'element':
                    if (args.element != null) {
                        return module + core.separateur.element + args.element;
                    } else {
                        return '';
                    }

                    break;
                case 'modifier':
                    if (args.element != null && args.modifier != null) {
                        return module + core.separateur.element + args.element + core.separateur.modifier + args.modifier;
                    }

                    if (args.modifier != null) {
                        return module + core.separateur.modifier + args.modifier;
                    } else {
                        return '';
                    }
                    break;
            }
        }
    };

    const prototypeBEM = {
        'getElement': function (element) {
            return core.getClass(module, 'element', {element: element});
        },
        'getBlock': function () {
            return core.getClass(module, 'block', {});
        },
        'getModifier': function (modifier, element) {
            return core.getClass(module, 'modifier', {modifier: modifier, element: element});
        },
        'selector': {
            'getElement': function (element) {
                return '.' + prototypeBEM.getElement(element);
            },
            'getBlock': function () {
                return '.' + prototypeBEM.getBlock();
            },
            'getModifier': function (modifier, element) {
                return '.' + prototypeBEM.getModifier(modifier, element);
            }
        }
    };
    // Pattern adaptateur
    return prototypeBEM;

}

export default BEM;
