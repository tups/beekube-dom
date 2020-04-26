import SearchSelect from "./search-select";


let beehivesSearch = document.querySelectorAll('.input-beehive');
Array.prototype.forEach.call(beehivesSearch, function (beehiveSearch) {
    new SearchSelect(beehiveSearch, {
        templateItem : [
            {
                'div' : {
                    'class': SearchSelect.SSBEM.getElement('item-icon'),
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
                    'class': SearchSelect.SSBEM.getElement('item-text'),
                    'textContent': '{{name}}'
                }
            },
            {
                'div' : {
                    'class': SearchSelect.SSBEM.getElement('item-type'),
                    'children': [
                        {'strong' : {'textContent' : '{{type}}'}},
                        {'span' : { 'textContent' : ' - {{cadres}}'}},
                    ]
                }
            },
        ]
    });
});