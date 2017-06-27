// use a mock DOM so we can run mithril on the server
require('mithril/test-utils/browserMock')(global);

const
  assert = require('assert'),
  fs = require('fs'),
  path = require('path'),
  babel = require("babel-core"),
  mithril = require('mithril'),
  render = require('mithril-node-render');

function BabelTransform(source) {
  return babel.transform(source, { "plugins": [["transform-react-jsx", { "pragma": "h" }]] });
};

const Templater = function (viewsPath) {

  assert(viewsPath, "The Views path is obligatory!");

  this.viewsPath = viewsPath;

  this.templates = [];

  this.compile = async (templateName) => {
    try {
      let templatePath = path.join(viewsPath, templateName + '.jsx');

      if (!fs.existsSync(templatePath)) throw new Error('File does not exist');

      let file = fs.readFileSync(templatePath).toString();

      file = "(function(h, sx) { return async function(it) { \n " + file + "\n }; })";

      let compiled = BabelTransform(file).code;

      this.templates[templateName] = eval(compiled)(mithril, this);

    } catch (e) {
      throw e;
    }
  }

  this.render = async function (templateName, model) {
    return await render(await this.executeTemplate(templateName, model));
  };

  this.extends = async function (templateBaseName, props) {
    return await this.executeTemplate(templateBaseName, props);
  };

  this.executeTemplate = async function (templateName, model) {
    return await this.getTemplate(templateName)(model);
  };

  this.getTemplate = function (templateName) {
    if (!this.templates[templateName])
      this.compile(templateName);

    return this.templates[templateName];
  };

  return this;
}

module.exports = Templater;