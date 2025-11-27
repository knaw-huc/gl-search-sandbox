import urllib.request
from functools import lru_cache
from typing import List, Dict
import json
import itertools

import elasticsearch
from elasticsearch.helpers import bulk

with open('transform/output_hierarchical.json', 'r') as f:
    tree_data = json.loads(f.read())

with open('transform/output_items.json', 'r') as f:
    data = json.loads(f.read())


INDEX_NAME = 'globalise'


def build_tree(tree_data: List[Dict]):
    """
    Builds a hierarchical tree structure from a list of dictionaries. Each dictionary in the list represents
    a node with its attributes and optionally its child nodes. The function organizes these nodes into
    a nested tree structure based on their hierarchical relationships.

    The tree has two root nodes.

    :param tree_data: A list of dictionaries, where each dictionary represents data for a node. It includes
        node attributes and may also define children nodes.
    :type tree_data: List[Dict]
    :return: The root of the hierarchical tree structure represented as a nested dictionary format
        containing all subnodes and their attributes.
    :rtype: Dict
    """
    tree = {}
    uuid_to_value = {}

    for raw_node in tree_data:
        node = {
            'uuid': raw_node['uuid'],
            'code': raw_node.get('code', '-'),
            'title': raw_node['title'],
            'children': {},
        }
        value = node['code']
        if len(raw_node['parents']) == 0:
            node['value'] = value
            tree[raw_node['uuid']] = node
            uuid_to_value[raw_node['uuid']] = value
        else:
            tmp = tree
            for parent in raw_node['parents']:
                if 'children' not in tmp:
                    tmp = tmp[parent]
                    value = tmp['value'] + '|' + node['code']
                    continue
                tmp = tmp['children'][parent]
                value = tmp['value'] + '|' + node['code']
            if 'value' in tmp:
                node['parent'] = tmp['value']
            node['value'] = value
            tmp['children'][raw_node['uuid']] = node
            uuid_to_value[raw_node['uuid']] = value

    return tree, uuid_to_value


def parse_year(date: str):
    """
    Parses and extracts the year from a given date string formatted as 'YYYY', 'YYYY-MM-DD' or 'YYYYMMDD'.

    This function takes a date string in a specific format, splits it by the delimiter '-',
    retrieves the first component (representing the year), and converts it into an integer.

    :param date: A date string formatted as 'YYYY', 'YYYY-MM-DD' or 'YYYYMMDD'.
    :type date: str
    :return: The extracted year as an integer.
    :rtype: int
    """
    if '-' in date:
        return int(date.split('-')[0])
    else:
        return int(date[:4])


@lru_cache
def get_pages(url: str):
    """
    Fetches pages data from the given URL and extracts their textual content.

    This function takes a URL as an argument, fetches its data, and extracts the
    text content of each page from the JSON response.

    :param url: The URL containing the JSON data with pages information.
    :type url: str
    :return: A list of strings where each string represents the text of one page.
    :rtype: list
    """
    with urllib.request.urlopen(url) as f:
        pages_data = json.loads(f.read())
    return [page['text'] for page in pages_data]


def document_generator(data: List, uuid_mapping: Dict):
    """
    Generates and yields document entries for indexing, transforming input data into
    a specified format. Each generated entry will be equipped with metadata and
    structured information suitable for a specific index.

    :param data: The list of dictionaries representing the input data. Each dictionary
        must contain keys such as 'id', 'uuid', 'title', 'dates', and 'textUrl'.
    :yield: A dictionary formatted for indexing, containing keys '_index', '_id',
        and '_source' with associated document data.
    """
    size = len(data)
    current = 0

    for item_raw in data:
        # Get text
        url = item_raw['textUrl']
        pages = get_pages(url)

        item = {
            'id': item_raw['id'],
            'location': uuid_mapping.get(item_raw['parents'][-1], ''),
            'title': item_raw['title'],
            'years_from': [parse_year(date['from']) for date in item_raw['dates']],
            'years_until': [parse_year(date['until']) for date in item_raw['dates']],
            'pages': pages,
        }

        yield {
            '_index': INDEX_NAME,
            '_id': item['id'],
            '_source': item
        }

        current += 1
        if current % 1000 == 0:
            print(f'Processed {current} of {size}')

tree, uuid_to_value = build_tree(tree_data)

with open("transform/output_tree.json", "w") as f:
    f.write(json.dumps(tree, indent=4))

gen = document_generator(data, uuid_to_value)

index = elasticsearch.Elasticsearch(hosts=['http://localhost:9200'])

index.indices.delete(index=INDEX_NAME, ignore=[400, 404])

mappings = {
    "properties": {
        "location": {
            'type': 'text',
            'fields': {
                'keyword': {
                    'type': 'text',
                    'fielddata': True,
                    'analyzer': 'custom_path_tree'
                },
            }
        },
        "title": {"type": "text"},
        "years_from": {"type": "integer"},
        "years_until": {"type": "integer"},
        "pages": {"type": "text"}
    }
}

settings = {
    "settings": {
        "analysis": {
            "analyzer": {
                "custom_path_tree": {
                    "tokenizer": "custom_hierarchy"
                },
            },
            "tokenizer": {
                "custom_hierarchy": {
                    "type": "path_hierarchy",
                    "delimiter": "|"
                },
            }
        }
    },
    "mappings": mappings
}

index.indices.create(index=INDEX_NAME, body=settings)


batches = itertools.batched(gen, 20)

for batch in batches:
    bulk(index, batch)