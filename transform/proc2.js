import {readFile, writeFile} from 'node:fs/promises';
import {XmlDocument} from 'libxml2-wasm';
import invent from './invent-list.json' with {type: 'json'};

const ns = {ead: 'http://www.openarchives.org/OAI/2.0/'};
const getItems = (parentNode, parents = []) =>
    parentNode.find('./ead:c', ns).flatMap(node => getItem(node, parents));

function getItem(node, parents) {
    const type = node.attr('level')?.content;
    const id = node.get('./ead:did/ead:unitid[@identifier]', ns)?.content;
    const uuid = node.get("./ead:did/ead:unitid[@type='urn:uuid']", ns)?.content;
    const series_code = node.get("./ead:did/ead:unitid[@type='series_code']", ns)?.content;
    const unitid = node.get("./ead:did/ead:unitid[not(@identifier) and not(@type)]", ns)?.content;
    const title = node.get('./ead:did/ead:unittitle', ns)?.content?.trim();
    const dates = node.find('./ead:did//ead:unitdate/@normal', ns).map(attr => {
        const dates = attr.content.split('/');
        return {
            'from': dates[0],
            'until': dates.length > 1 ? dates[1] : dates[0]
        };
    });

    const code = series_code || unitid;
    const textUrl = id ? `https://objectstore.surf.nl/87435b768620494e8e911c83d1997f24:globalise-data/NL-HaNA/1.04.02/${id}/text.json` : undefined;

    return [
        {type, id, uuid, code, title, dates, textUrl, parents},
        ...getItems(node, [...parents, uuid])
    ];
}

using xml = XmlDocument.fromBuffer(await readFile('../data/1.04.02.xml'));
const allItems = getItems(xml.get('//ead:ead/ead:archdesc/ead:dsc', ns));

const filteredItems = allItems.filter(x => invent.includes(x.id));

const allParents = new Set(filteredItems.flatMap(node => node.parents));
const hierarchicalItems = allItems.filter(x => allParents.has(x.uuid));

writeFile('output_items.json', JSON.stringify(filteredItems, null, '\t'));
writeFile('output_hierarchical.json', JSON.stringify(hierarchicalItems, null, '\t'));
