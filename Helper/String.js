
function getContentVariable(element) {
    let content = '';
    switch (typeof element) {
        case 'function':
            content = element();
            break;
        default :
            content = element;
            break;
    }
    return content;
}

export {getContentVariable};