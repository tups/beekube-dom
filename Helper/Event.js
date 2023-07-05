// Gestionnaire d'evenement
const EVENT_ON = 1;
const EVENT_OFF = 0;



function dispatchTypeEvent(status, eventObject) {
    switch (status) {
        case EVENT_ON:
            eventObject.element.addEventListener(eventObject.type, eventObject.listener, eventObject.options);
            break;
        case EVENT_OFF:
            eventObject.element.removeEventListener(eventObject.type, eventObject.listener, eventObject.options);
            break;
    }
}

/**
 * @param status
 * @param eventObject object
 * @returns {*}
 *
 *
 */
function configureEvent(status, eventObject) {

    if (eventObject.element === null) {
        return false;
    }

    switch(true) {

        case eventObject.element instanceof NodeList:
        case eventObject.element instanceof Array:

            let elements = Array.from(eventObject.element);
            elements.forEach(function (element) {
                let eventObjectClone = {
                    'element': element,
                    'type': eventObject.type,
                    'listener': eventObject.listener,
                    'options': eventObject.options,
                };

                dispatchTypeEvent(status, eventObjectClone);
            });

            break;
        case eventObject.element instanceof Node:
            dispatchTypeEvent(status, eventObject);
            break;
        default:
            dispatchTypeEvent(status, eventObject);
            break;
    }



    return true;
}


const matchEventType = {
    'FocusEvent': ['focus', 'blur', 'focusin', 'focusout'],
    'MouseEvent': ['click', 'dblclick', 'mouseup', 'mousedown'],
    'TouchEvent': ['touchstart', 'touchend', 'touchmove', 'touchcancel'],
    'KeyboardEvent': ['keydown', 'keypress', 'keyup'],
};

const matchEventObject = {
    'FocusEvent': typeof FocusEvent === "undefined" ? Event : FocusEvent,
    'MouseEvent':  typeof MouseEvent === "undefined" ? Event : MouseEvent,
    'TouchEvent':  typeof TouchEvent === "undefined" ? Event : TouchEvent,
    'KeyboardEvent': typeof KeyboardEvent === "undefined" ? Event : KeyboardEvent,
}

function getEventObject(eventName) {
    for( let event in matchEventType ) {

        if(matchEventType[event].indexOf(eventName) !== -1) {
            return matchEventObject[event];
        }
    }
    return Event;
}

/**
 * @param obj
 * @param evts
 * @param data
 * @param options
 * @returns {boolean}
 */
function fireEvent(obj, evts, data = false, options = {"bubbles":true, "cancelable":true}) {
    var t, evt;

    if (obj === null || typeof obj === "undefined") {
        return false;
    }
    // on verifie si il y a plusieurs élements
    evts = (evts || "").match(/\S+/g) || [""];
    // on les comptes
    t = evts.length;
    // On créé chaque évenement un par un
    while (t--) {
        evt = evts[t];
        if (typeof Event === 'function' || !document.fireEvent) {
            var eventClass = getEventObject(evt, options);
            var event = new eventClass(evt, options);

            if(data) {
                Object.assign(event, data);
            }

            obj.dispatchEvent(event);
        } else {
            obj.fireEvent('on' + evt);
        }
    }
}

//Returns true if it is a DOM element
function isElement(o) {
    return (
        typeof o === "object" && o.nodeType === 1 && typeof o.nodeName === "string"
    );
}

function eventIsOnSelector(event, selector) {
    if (!isElement(event.target)) {
        return false;
    }
    var DOM = event.target.matches(selector) ? event.target : event.target.closest(selector);
    if (DOM === null) {
        return false;
    }

    return DOM;
}



const EventOn = configureEvent.bind(null, EVENT_ON);
const EventOff = configureEvent.bind(null, EVENT_OFF);
const EventFire = fireEvent;

const defaultEventOptions = {
    'element': null,
    'type': 'click',
    'listener': function () {},
    'options': false
};

const HelperEvent = {
    on: EventOn,
    off: EventOff,
    fire: EventFire,
    eventIsOnSelector: eventIsOnSelector,
    defaultEventOptions: defaultEventOptions
};

export {EventOn, EventOff, EventFire, eventIsOnSelector, defaultEventOptions};
export default HelperEvent;
