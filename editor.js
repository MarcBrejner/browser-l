var codeMirrorEditor = CodeMirror.fromTextArea(document.getElementById('editorWindow'), {
    lineNumbers: true,
    value: ""
})

var codeMirrorPretty = CodeMirror.fromTextArea(document.getElementById('prettyWindow'), {
    lineNumbers: true,
    value: "",
    editable: false
})

codeMirrorEditor.on('change',function(cMirror){
    // get value right from instance
    codeMirrorPretty.setValue(cMirror.getValue());
    console.log(cMirror.getValue());
});

const Parser = window.TreeSitter;
async function initialize_parser() {
  await Parser.init();
  const parser = new Parser();
  const Javascript = await Parser.Language.load('tree-sitter-l.wasm');
  parser.setLanguage(Javascript);
  return parser;
}

async function print_parse(source_code){
    var p = await initialize_parser();
    var t = p.parse(source_code)
    console.log(t.rootNode.toString())
}


function clickclick(parser){
    print_parse(myCodeMirror.getValue());
}