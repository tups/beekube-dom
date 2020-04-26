
import Component from '../BaseApp/Component';
import BEM from "../Helper/BEM";

const SSBEM = BEM('search-select');

function SearchSelect(input, param) {
    this.input = input;

    // Clone parametres
    let thisParam = Object.assign({}, param);
    let thisDefaultOptions = Object.assign({}, this.options);
    this.options = Object.assign(thisDefaultOptions, thisParam);

    init.bind(this)();
}

SearchSelect.defaultOptions = {
    'url': '',
    'templateItem': [
        {
            'div' : {
                'class': SSBEM.getElement('item-icon'),
                'children': [
                    {
                        'svg': {
                            'class': ['icon', 'icon--22'],
                            'children': [{'use': {'href': '#{{icon}}'}}]
                        }
                    }
                ]
            }
        },
        {
            'div' : {
                'class': SSBEM.getElement('item-text'),
                'textContent': '{{name}}'
            }
        },
    ]
};

SearchSelect.SSBEM = BEM('search-select');

function init() {

    new ComposantSearchSelect({
        'template': { 'item': this.options.templateItem }
    }, this.input);
}



class ItemSearch extends Component {
    constructor(states, element) {
        states = Object.assign({
            'templateItem': []
        }, states);
        super(states, element);
    }

    render() {
        return [
            {
                'a': {
                    'class': SSBEM.getElement('item'),
                    'href': 'javascript:void(0);',
                    'children': this.props.templateItem
                }
            }
        ]
    }
}

class ComposantSearchSelect extends Component {

    constructor(states, element) {

        states = Object.assign({
            'input': null,
            'placeholder' : {
                'icon' : 'icons-ruche',
                'text': 'Sélectionner'
            },
            'items': [
                {
                    'icon': 'icons-ruche-26',
                    'name': 'R2345',
                    'type': 'Dadant',
                    'cadres': '10 cadres'
                },
                {
                    'icon': 'icons-ruchette-26',
                    'name': 'R2312',
                    'type': 'Dadant',
                    'cadres': '6 cadres'
                },
            ],
            'template': {
                'item' : []
            },
            'dropdown' : {
                'isOpen': false
            },
            'dropdownIsOpen' : ''
        }, states);

        super(states, element);

        this.onToggleDropdown = this.onToggleDropdown.bind(this);
    }

    onToggleDropdown(event) {
        let props = this.props;
        props.dropdown.isOpen = !props.dropdown.isOpen;
        //props.dropdownIsOpen = SSBEM.getModifier('open');
        this.props = props;
    }

    render() {
        let searchSelectClass = [SSBEM.getBlock()];

        let items = [];
        let self = this;
        if(this.props.dropdown.isOpen) {
            searchSelectClass.push(SSBEM.getModifier('open'));
            items.push({
                'div': {
                    'textContent': 'test'
                }
            });
            this.props.items.forEach(function (item) {
                let thisState = Object.assign({
                    'templateItem': self.props.template.item,
                }, item);
                items.push(ItemSearch.bind(null, thisState))
            });
        }



        let dropDown =
            {
                'div' : {
                    'class': [SSBEM.getElement('dropdown')],
                    'children': [
                        {
                            'div': {
                                'class': SSBEM.getElement('search'),
                                'children': [
                                    {
                                        'svg': {
                                            'class': ['icon', 'icon--24'],
                                            'children': [{'use': {'href': '#icons-search'}}]
                                        }
                                    },
                                    {
                                        'input': {
                                            'type': 'text',
                                            'name': 'search-select'
                                        }
                                    },
                                ]
                            }
                        },
                        {
                            'div': {
                                'class': SSBEM.getElement('list'),
                                'children': items
                            }
                        }
                    ]
                }
            };

        let placeholder = [
            {
                'div' : {
                    'class': SSBEM.getElement('placeholder-icon'),
                    'children': [
                        {
                            'svg': {
                                'class': ['icon', 'icon--22'],
                                'children': [{'use': {'href': '#' + this.props.placeholder.icon}}]
                            }
                        }
                    ]
                }
            },
            {
                'div' : {
                    'class': SSBEM.getElement('placeholder-text'),
                    'textContent': this.props.placeholder.text
                }
            },
        ];
        // if(true) {
        //     searchSelectClass.push(this.SSBEM.getModifier('open'))
        // }

        return [
            {
                'div': {
                    'class': searchSelectClass,
                    'children' : [
                        {
                            'div' : {
                                'class': SSBEM.getElement('input'),
                                'children': placeholder,
                                "click": {
                                    'listener': this.onToggleDropdown.bind(this),
                                    'useCapture': false
                                },
                            }
                        },
                        {
                            'div' : {
                                'class': [SSBEM.getElement('qrcode'), 'button'],
                                'children': [
                                    {
                                        'svg': {
                                            'class': ['icon', 'icon--24'],
                                            'children': [{'use': {'href': '#icons-qrcode'}}]
                                        }
                                    }
                                ]
                            }
                        },
                        dropDown
                    ]
                }
            }
        ];
    }

}

export default SearchSelect;