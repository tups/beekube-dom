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
    }



    return true;
}

function fireEvent(obj, evts) {
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
            var event = document.createEvent('HTMLEvents');
            event.initEvent(evt, true, true);
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