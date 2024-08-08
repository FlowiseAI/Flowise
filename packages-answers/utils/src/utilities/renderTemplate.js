import Handlebars from 'handlebars';

// Register the helper function
Handlebars.registerHelper('helperMissing', function () {
  return '';
});

export function precompileTemplate(templateString) {
  return Handlebars.precompile(templateString);
}

export function getTemplate(precompiled) {
  return Handlebars.template(eval('(' + precompiled + ')'));
}

export function renderTemplate(templateString, context) {
  // console.log(JSON.stringify(context, null, 2));
  const template = Handlebars.compile(templateString);
  const renderedTemplate = template(context);
  return renderedTemplate;
}
