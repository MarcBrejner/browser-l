var myCodeMirror = CodeMirror.fromTextArea(document.getElementById('editor1'), {
    lineNumbers: true
})

myCodeMirror.on('change',function(cMirror){
    // get value right from instance
    console.log(cMirror.getValue());
});

const a = (async () => { const data = await initialize(); return data })()

const Parser = window.TreeSitter;
async function initialize_parser() {
  await Parser.init();
  const parser = new Parser();
  const Javascript = await Parser.Language.load('tree-sitter-l.wasm');
  parser.setLanguage(Javascript);
  return parser;
}

var parseer = await initialize();
parseer.parse("$x:=1+1;")
function clickclick(parser){
    var tree = parser.parse(cMirror.getValue());
    console.log(tree.rootNode.toString());  
}


// 1. Call helloCatAsync passing a callback function,
//    which will be called receiving the result from the async operation
console.log("1. function called...")
helloCatAsync(function(result) {
    // 5. Received the result from the async function,
    //    now do whatever you want with it:
    var p = result;
});

// 2. The "callback" parameter is a reference to the function which
//    was passed as an argument from the helloCatAsync call
function helloCatAsync(callback) {
    console.log("2. callback here is the function passed as argument above...")
    // 3. Start async operation:
    setTimeout(function() {
    console.log("3. start async operation...")
    console.log("4. finished async operation, calling the callback, passing the result...")
        // 4. Finished async operation,
        //    call the callback passing the result as argument
        callback('Nya');
    }, Math.random() * 2000);
}