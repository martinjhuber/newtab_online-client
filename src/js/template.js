/*
 * Simple templating "engine" for newtab online
 *
 * Usage:
 * - get(templateId, dataObject) -> returns html code of template with applied data
 * - fill(elementId, templateId, dataObject) -> puts html code into the DOM element
 * - fillAndPersist(elementId, templateId, dataObject) -> calls fill(...) and also
 *      persists data for later replay/refresh
 * - refreshPersistent() -> replay/refresh all persistent template & data entries
 * - clearPersistentStore() -> clears persistent template & data store
 * 
 * Looks for DOM element with id "tmpl-"+templateId and applies data object to it.
 *  
 * Supports:
 * - basic data tags: {{=id}} -> replaced with dataObject[id]
 * - if statements: {{if:condition}}...{{end}} -> checks if condition==true.
 *      Condition can either be:
 *      - an id of dataObject, which is checked against dataObject[id]==true
 *      - a comparision with the operators ==, !=, >, <, >= or <=
 *        The left or right hand side can be ids of dataObject or a primitive type.
 *        If dataObject does not contain a property with the left or right value,
 *        it is assumed to be a primitive type.
 *        Examples: {{if:id=StringValue}}, {{if:id>=4}}, {{if:2.0<5.2}}
 *      Use {{else}}...{{end}} for blocks that are used if condition=false.
 * - for loops: {{for:id}}...{{end}} -> iterates through array in dataObject[id] and
 *      applies array element to inner template. Supports nested lists.
 *      Use {{sep}}...{{end}} at the start(!) of a {{for}} structure to define a 
 *      separator that is put between elements. Separators do not support any 
 *      placeholders other than i18n.
 * - internationalisation: {{i18n:id}} -> replaced with I18n.get(id) translation.
 *      If you want to use this feature, you must first call the method setI18n(i18n)
 *      and pass an internationalisation object which has a get(tagId) method
 *      that returns a (localised) text for the given tag.   
 */

class TemplateImpl {
    
    constructor() { }

    setI18n(i18n) {
        this.i18n = i18n;
        this.fillPersistence = {};
    }

    fillAndPersist(elementId, templateId, data = null) {
        this.fillPersistence[elementId] = { 
            elementId : elementId,
            templateId : templateId,
            data : data
        };
        this.fill(elementId, templateId, data);
    }

    refreshPersistent() {
        for (let key in this.fillPersistence) {
            let obj = this.fillPersistence[key];
            this.fill(obj.elementId, obj.templateId, obj.data);
        }
    }

    clearPersistentStore() {
        this.fillPersistence = {};
    }

    fill(elementId, templateId, data = null) {
        let html = this.get(templateId, data);
        $("#"+elementId).html(html);
    }

    get(templateId, data = null) {

        let template = $("#tmpl-"+templateId);

        if (!template.length) {
            return "###TEMPLATE_MISSING###:"+templateId;
        }

        let templateText = template.html();

        // replace {{i18n:*}} strings
        let regexp = /\{\{i18n:([^\}]+)\}\}/;
        let match;
        while (match = templateText.match(regexp)) {
            templateText = templateText.replace(match[0], this.i18n.get(match[1]));
        }

        // replace for loops and basic data tags
        templateText = this._handleBlock(templateText, data);

        return templateText;
    }

    _handleBlock(templateBlock, dataBlock) {

        if (!dataBlock) {
            return templateBlock;
        }

        // find {{for:*}}...{{end}} and apply data
        templateBlock = this._handleFor(templateBlock, dataBlock);

        // evaluate if statements: {{if:*}}...{{end}}
        templateBlock = this._handleIf(templateBlock, dataBlock)

        // apply basic data tag values
        for (let prop in dataBlock) {
            templateBlock = templateBlock.replace(new RegExp('\{\{='+prop+'\}\}', 'g'), dataBlock[prop]);
        }

        return templateBlock;
    }

    _handleFor(templateBlock, dataBlock) {

        let forMatch;
        while (forMatch = templateBlock.match(/\{\{for:([^\}]+)\}\}/)) {
            let dataId = forMatch[1];
            
            let indexOfEnd = this._findEndIndex(templateBlock, forMatch.index);            
            let innerTemplateBlock = templateBlock.substring(forMatch.index+forMatch[0].length, indexOfEnd);

            let separator = innerTemplateBlock.match(/^\s*{{sep}}(.+){{end}}/);
            if (separator) {
                innerTemplateBlock = innerTemplateBlock.replace(separator[0], "");
            }

            let replacement = "";
            if (dataBlock[dataId]) {
                for(let i = 0; i < dataBlock[dataId].length; ++i) {
                    if (separator && i > 0) {
                        replacement += separator[1];
                    }
                    replacement += this._handleBlock(innerTemplateBlock, dataBlock[dataId][i]);
                }
            }

            templateBlock =
                templateBlock.substring(0, forMatch.index) + 
                replacement +
                templateBlock.substring(indexOfEnd + 7);    // {{end}} = 7 chars
        }

        return templateBlock;
    }

    _handleIf(templateBlock, dataBlock) {

        let ifMatch;
        while (ifMatch = templateBlock.match(/\{\{if:([^\}]+)\}\}/)) {
            let condition = ifMatch[1];
            let indexOfEnd = this._findEndIndex(templateBlock, ifMatch.index);

            let trueBlock = templateBlock.substring(ifMatch.index+ifMatch[0].length, indexOfEnd);
            let falseBlock = "";

            let elseMatch = trueBlock.match(/{{else}}(.+){{end}}/);
            if (elseMatch) {
                trueBlock = trueBlock.replace(elseMatch[0], "");
                falseBlock = elseMatch[1];
            }

            let comparison;
            let comparisonMatch = condition.match(/^(.+)(>=?|<=?|==|!=)(.+)$/);
            if (comparisonMatch) {
                let leftSide = comparisonMatch[1];
                let comparator = comparisonMatch[2];
                let rightSide = comparisonMatch[3];
                if (dataBlock.hasOwnProperty(leftSide)) {
                    leftSide = dataBlock[leftSide];
                }
                if (dataBlock.hasOwnProperty(rightSide)) {
                    rightSide = dataBlock[rightSide];
                }
                switch (comparator) {
                    case '==':
                        comparison = (leftSide == rightSide);
                        break;
                    case '!=':
                        comparison = (leftSide != rightSide);
                        break;
                    case '>':
                        comparison = (leftSide > rightSide);
                        break;
                    case '<':
                        comparison = (leftSide < rightSide);
                        break;
                    case '>=':
                        comparison = (leftSide >= rightSide);
                        break;
                    case '<=':
                        comparison = (leftSide <= rightSide);
                        break;
                    default:
                        false;
                }
                console.log(leftSide, comparator, rightSide);

            } else {
                comparison = dataBlock[condition] ? true : false;
            }

            let replacement = comparison ? trueBlock : falseBlock;

            templateBlock =
                templateBlock.substring(0, ifMatch.index) + 
                replacement +
                templateBlock.substring(indexOfEnd + 7);    // {{end}} = 7 chars

        }

        return templateBlock;
    }


    _findEndIndex(templateBlock, startIndex) {

        let searchFromIndex = startIndex + 1;
        let indent = 1;
        let blockTags;
        while (blockTags = templateBlock.substring(searchFromIndex).match(/\{\{(for|if|else|sep|end)/)) {

            if (blockTags[1] == "end") {
                indent -= 1;
            } else {
                indent += 1;
            }

            if (indent <= 0) {
                return searchFromIndex + blockTags.index;
            } else {
                searchFromIndex += blockTags.index + 1;
            }

        }

        return "###END_TAG_MISSING###";
    }

}

let Template = new TemplateImpl();

export { Template };