/**
 * Created by Andy Likuski on 2017.11.15
 * Copyright (c) 2017 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
// import {sankeyGenerator, sankeyGeospatialTranslate} from 'sankeyHelpers';
import sankeyData from './sankey.sample';
import * as R from 'ramda';
import NamedTupleMap from 'namedtuplemap';

describe('sankeyHelpers', () => {
  test('Turf is breaking this', () => {
  });
  /*
  test('sankeyGenerator', () => {
    const graph = {
      "nodes": [
        {
          "siteName": "Other Global Imports",
          "location": "Shipments, location generalized",
          "coordinates": "51.309933, 3.055030",
          "junctionStage": "Source",
          "annualTonnage": "22,469,843",
          "index": 0,
          "material": "Minerals",
          "isGeneralized": false,
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [
              3.05503,
              51.309933
            ],
            "__typename": "GeoJSONPoint"
          },
          "name": "Other Global Imports",
          "value": 22469843,
          "__typename": "SankeyNode"
        },
        {
          "siteName": "Knauf (Danilith) BE",
          "location": "Waregemseweg 156-142 9790 Wortegem-Petegem, Belgium",
          "coordinates": "50.864762, 3.479308",
          "junctionStage": "Conversion",
          "annualTonnage": "657,245",
          "index": 1,
          "material": "Minerals",
          "isGeneralized": false,
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [
              3.479308,
              50.864762
            ],
            "__typename": "GeoJSONPoint"
          },
          "name": "Knauf (Danilith) BE",
          "value": 657245,
          "__typename": "SankeyNode"
        },
        {
          "siteName": "MPRO Bruxelles",
          "location": "Avenue du Port 67 1000 Bruxelles, Belgium",
          "coordinates": "50.867486, 4.352543",
          "junctionStage": "Distribution",
          "annualTonnage": "18,632",
          "index": 2,
          "material": "Minerals",
          "isGeneralized": false,
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [
              4.352543,
              50.867486
            ],
            "__typename": "GeoJSONPoint"
          },
          "name": "MPRO Bruxelles",
          "value": 18632,
          "__typename": "SankeyNode"
        },
        {
          "siteName": "Residential Buildings (all typologies)",
          "location": "Everywhere in Brussels",
          "coordinates": "NA",
          "junctionStage": "Demand",
          "annualTonnage": "3,882,735",
          "index": 3,
          "material": "Minerals",
          "isGeneralized": true,
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [
              4.3667,
              50.8353
            ],
            "__typename": "GeoJSONPoint"
          },
          "name": "Residential Buildings (all typologies)",
          "value": 3882735,
          "__typename": "SankeyNode"
        },
        {
          "siteName": "Duplex House Typology",
          "location": "Everywhere in Brussels",
          "coordinates": "NA",
          "junctionStage": "Demand",
          "annualTonnage": "13,544",
          "index": 4,
          "material": "Minerals",
          "isGeneralized": true,
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [
              4.3317000000000005,
              50.8703
            ],
            "__typename": "GeoJSONPoint"
          },
          "name": "Duplex House Typology",
          "value": 13544,
          "__typename": "SankeyNode"
        },
        {
          "siteName": "Apartment Building Typology",
          "location": "Everywhere in Brussels",
          "coordinates": "NA",
          "junctionStage": "Demand",
          "annualTonnage": "34,643",
          "index": 5,
          "material": "Minerals",
          "isGeneralized": true,
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [
              4.3767000000000005,
              50.8253
            ],
            "__typename": "GeoJSONPoint"
          },
          "name": "Apartment Building Typology",
          "value": 34643,
          "__typename": "SankeyNode"
        },
        {
          "siteName": "New West Gypsum Recycling",
          "location": "9130 Beveren, Sint-Jansweg 9 Haven 1602, Kallo, Belgium",
          "coordinates": "51.270229, 4.261048",
          "junctionStage": "Reconversion",
          "annualTonnage": "87,565",
          "index": 6,
          "material": "Minerals",
          "isGeneralized": false,
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [
              4.261048,
              51.270229
            ],
            "__typename": "GeoJSONPoint"
          },
          "name": "New West Gypsum Recycling",
          "value": 87565,
          "__typename": "SankeyNode"
        },
        {
          "siteName": "Residential Buildings (all typologies)",
          "location": "Everywhere in Brussels",
          "coordinates": "NA",
          "junctionStage": "Sink",
          "annualTonnage": "120,000",
          "index": 7,
          "material": "Minerals",
          "isGeneralized": true,
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [
              4.3867,
              50.8153
            ],
            "__typename": "GeoJSONPoint"
          },
          "name": "Residential Buildings (all typologies)",
          "value": 120000,
          "__typename": "SankeyNode"
        },
        {
          "siteName": "RecyPark South",
          "location": "1190 Forest, Belgium",
          "coordinates": "50.810799, 4.314789",
          "junctionStage": "Sink",
          "annualTonnage": "3,130",
          "index": 8,
          "material": "Minerals",
          "isGeneralized": false,
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [
              4.314789,
              50.810799
            ],
            "__typename": "GeoJSONPoint"
          },
          "name": "RecyPark South",
          "value": 3130,
          "__typename": "SankeyNode"
        },
        {
          "siteName": "RecyPark Nord",
          "location": "Rue du Rupel, 1000 Bruxelles, Belgium",
          "coordinates": "50.880181, 4.377136",
          "junctionStage": "Sink",
          "annualTonnage": "1,162",
          "index": 9,
          "material": "Minerals",
          "isGeneralized": false,
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [
              4.377136,
              50.880181
            ],
            "__typename": "GeoJSONPoint"
          },
          "name": "RecyPark Nord",
          "value": 1162,
          "__typename": "SankeyNode"
        }
      ],
      "links": [
        {
          "source": 0,
          "target": 1,
          "value": 22469843,
          "__typename": "SankeyLink"
        },
        {
          "source": 1,
          "target": 2,
          "value": 657245,
          "__typename": "SankeyLink"
        },
        {
          "source": 2,
          "target": 3,
          "value": 18632,
          "__typename": "SankeyLink"
        },
        {
          "source": 2,
          "target": 4,
          "value": 18632,
          "__typename": "SankeyLink"
        },
        {
          "source": 2,
          "target": 5,
          "value": 18632,
          "__typename": "SankeyLink"
        },
        {
          "source": 3,
          "target": 6,
          "value": 3882735,
          "__typename": "SankeyLink"
        },
        {
          "source": 4,
          "target": 6,
          "value": 13544,
          "__typename": "SankeyLink"
        },
        {
          "source": 5,
          "target": 6,
          "value": 34643,
          "__typename": "SankeyLink"
        },
        {
          "source": 6,
          "target": 7,
          "value": 87565,
          "__typename": "SankeyLink"
        },
        {
          "source": 6,
          "target": 8,
          "value": 87565,
          "__typename": "SankeyLink"
        },
        {
          "source": 6,
          "target": 9,
          "value": 87565,
          "__typename": "SankeyLink"
        }
      ]
    };
    expect(sankeyGenerator({
      width: 1048,
      height: 590,
      nodeWidth: 15,
      nodePadding: 15,
      geospatialPositioner: sankeyGeospatialTranslate({
        project: R.identity,
        unproject: R.identity
      })
    }, graph)).toMatchSnapeshot();
  });

  test('sankeyGenerator', () => {

    const cache = new NamedTupleMap();
    const q = {width: 480, height: 640};
    const r = {width: 480, height: 640};
    const value = {any: 'thing'};
    cache.set({sankeyData, ...q}, value);
    const res = cache.get({sankeyData, ...r});
    expect(res).toEqual(value);

    const f = sankeyGenerator;
    const x = {width: 480, height: 640};
    const y = {width: 480, height: 640};
    const a = f(x, sankeyData);
    const b = f(y, sankeyData);

    expect(a === b).toBe(true);
    const newSankeyData = R.set(R.lensPath(['nodes', 0, 'name']), 'Foobar', sankeyData);
    const c = sankeyGenerator({width: 480, height: 640}, newSankeyData);
    expect(c === b).toBe(false);
  });
  */
});


