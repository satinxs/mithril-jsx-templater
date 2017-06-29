// use a mock DOM so we can run mithril on the server
require('mithril/test-utils/browserMock')(global);

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { transform } = require("babel-core");
const mithril = require('mithril');
const render = require('mithril-node-render');

function BabelTransform(source) {
  return transform(source, {
    "plugins": [
      [
        "transform-react-jsx", {
          "pragma": "m"
        }
      ]
    ]
  });
};

function BootstrapSource(source) {
  return "(function(m, sx) { return async function(it) {  \n return " + source + ";\n }; })";
}

function resolveFileName(viewsPath, templateName) {
  let possiblePaths = ['jsx', 'html'].map(p => path.join(viewsPath, templateName + '.' + p));

  for (let i in possiblePaths) {
    if (fs.existsSync(possiblePaths[i]))
      return possiblePaths[i];
  }

  throw new Error('Template ' + templateName + ' not found.');
}

module.exports = class Templater {
  constructor(viewsPath, debug) {
    assert(viewsPath, "The Views path is obligatory!");
    this.viewsPath = viewsPath;
    this.templates = [];
    this.debug = debug || false;

    this.include = this.executeTemplate;
  }

  async readAndCompileFile(templateName) {
    let filePath = resolveFileName(this.viewsPath, templateName);

    let file = fs
      .readFileSync(filePath)
      .toString();

    let source = BootstrapSource(file);

    let compiledSource = BabelTransform(source).code;

    return eval(compiledSource)(mithril, this);
  }

  async compile(templateName) {
    try {
      let compiled = await this.readAndCompileFile(templateName);

      this.templates[templateName] = compiled;

    } catch (e) {
      throw new Error('Error compiling template "' + templateName + '"\nError: ' + e.message);
    }
  }

  async render(templateName, model) {
    let executedTemplate = await this.executeTemplate(templateName, model);

    return await render(executedTemplate);
  }

  async extends(templateBaseName, props) {
    return await this.executeTemplate(templateBaseName, props);
  }

  async executeTemplate(templateName, model) {
    return await (await this.getTemplate(templateName))(model);
  }

  async getTemplate(templateName) {

    if (!this.templates[templateName] || this.debug)
      await this.compile(templateName);

    return this.templates[templateName];
  }
}