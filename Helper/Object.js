
function isObject(obj) {
    let type = typeof obj;
    return type === 'object' && !!obj;
}

function cloneObject(src) {
    let target = Array.isArray(src) ? [] : {};

    // On retourne directement la fonction
    if(typeof src === "function") return src;

    for (let prop in src) {
        if (src.hasOwnProperty(prop)) {
            // if the value is a nested object, recursively copy all it's properties
            if (isObject(src[prop])) {
                if(Array.isArray(src[prop])) {
                    target[prop] = [];
                }
                target[prop] = cloneObject(src[prop]);
            } else {
                target[prop] = src[prop];
            }
        }
    }

    return target;
}


export {cloneObject, isObject};