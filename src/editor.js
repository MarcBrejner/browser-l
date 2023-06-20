var registerDiv = document.getElementById("registers");
var labelsDiv = document.getElementById("labels");
var constantsDiv = document.getElementById("constants");
var dataDiv = document.getElementById("data");
var memoryDiv = document.getElementById("memory");
var outputSpan = document.getElementById("output");
var chosenLevel = document.getElementById("levels");

var _VirtualMachine = null;
var _PrettyPrinter = null;

// Editable window
var codeMirrorEditor =
    CodeMirror.fromTextArea(document.getElementById('editorWindow'), {
      lineNumbers : true,
      value : "",
    })

chosenLevel.onchange = function(){
  CodeMirror.signal(codeMirrorEditor,'change', codeMirrorEditor)
}

// Fires whenever the editable window changes
codeMirrorEditor.on('change', async function(cMirror) {

  var source_code = cMirror.getValue();

  //  Set content of prettyWindow to the pretty printed code
  var code = await parse_and_pretty_print(source_code);
  document.getElementById("prettyPretty").innerHTML = code;

  //Fixes a bug with codemirror where added line classes persists too long
  clear_highlights();
})

// Load parser
const Parser = window.TreeSitter;
async function initialize_parser() {
  await Parser.init();
  var parsers = new Array();
  for (var i = 0; i < encoded_levels.length; i++) {
    let parser = new Parser();
    let L = await Parser.Language.load(encoded_levels[i]);
    parser.setLanguage(L);
    parsers.push(parser);
  }
  return parsers;
}

// Pretty print input sourcecode
async function parse_and_pretty_print(source_code) {
  let parsers = await initialize_parser();
  let tree_L0 = parsers[chosenLevel.value].parse(source_code);
  let program = BuildSystem(tree_L0);
  var VM = get_virtual_machine(program);
  // parse_byte_code from pretty.js pretty prints the byte_code
  //var pretty_printer = get_pretty_printer(program);
  return static_draw(VM);
}

async function parse_and_read(source_code) {
  var parsers = await initialize_parser();
  let tree_L0 = parsers[chosenLevel.value].parse(source_code);
  let program = BuildSystem(tree_L0);
  return program;
}

async function run_all() {
  outputSpan.innerHTML = '';
  var source_code = await codeMirrorEditor.getValue();
  var program = await parse_and_read(source_code);
  if(program.error_msg !== null){
    console.log(program.error_msg);
    return;
  }
  console.log(program)
  // updates the program of the virtual machine
  get_virtual_machine(program);
  reset_buttons_after_debug();
  execute_all();
}

async function debug() {
  outputSpan.innerHTML = '';
  for (let i = 0; i <= codeMirrorEditor.lastLine(); i++) {
    codeMirrorEditor.removeLineClass(i, 'background', 'highlight-line');
  }
  
  var source_code = await codeMirrorEditor.getValue();
  var program = await parse_and_read(source_code);
  //codeMirrorEditor.addLineClass(program.ECS.nodes[0].startPosition.row, 'background', 'highlight-line');
  
  if(program.error_msg !== null){
    console.log(program.error_msg);
    return;
  }
  color(program, 0)
  var VM = get_virtual_machine(program);
  show_results_in_html(VM.state);

  document.querySelector('#debugbutton').disabled = true;
  document.querySelector('#exitdebug').disabled = false;
  document.querySelector('#stepbutton').disabled = false;
  document.getElementById("prettyPretty").innerHTML = static_draw(VM);
}

async function exit_debug() {
  reset_buttons_after_debug();
  document.getElementById("prettyPretty").innerHTML = static_draw(VM);
  var source_code = await codeMirrorEditor.getValue();
  var program = await parse_and_read(source_code);
  var VM = get_virtual_machine(program);
  show_results_in_html(VM.state);
}

function execute_all() {
  while (true) { // step
    if (execute_step(false) == -1) {
      break;
    }
  }
}

function static_draw(VM) {
  var draw_object = VM.program.ECS.static_draws[0];
  var draw_parameters = VM.program.ECS.static_draw_params[0]
  if(draw_object !== null && draw_object !== undefined){
    return draw_object.draw(draw_parameters, VM)
  }
}

function draw(VM){
  var pc = VM.state.registers['$!']-1;
  var draw_object = VM.program.ECS.draws[pc];
  var draw_parameters = VM.program.ECS.drawparams[pc]
  if(draw_object !== null && draw_object !== undefined){
    draw_object.draw(draw_parameters,VM)
  }
}

function clear_highlights(){
  const marks = codeMirrorEditor.getAllMarks();
  marks.forEach(mark => {
    mark.clear();
  });
}

function color(program,pc){

  clear_highlights()
  
  const start = {line: program.ECS.nodes[pc].startPosition.row , ch: program.ECS.nodes[pc].startPosition.column}
  const end = {line: program.ECS.nodes[pc].endPosition.row , ch: program.ECS.nodes[pc].endPosition.column}
  codeMirrorEditor.markText(start, end, { className: 'highlight-line' });

}

function execute_step(debugging = true) {
  var VM = get_virtual_machine();
  VM.execute_bytecode();
  document.getElementById("prettyPretty").innerHTML = static_draw(VM);
  //var pretty_printer = get_pretty_printer(VM.program);
  //document.getElementById("prettyPretty").innerHTML = pretty_printer.print_program(VM.state);
  show_results_in_html(VM.state);

  if (VM.state.registers['$!'] >= VM.program.instructions.length) {
    console.log("EOF");
    draw(VM)
    reset_buttons_after_debug()
    return -1;
  }
  if(debugging){
    color(VM.program, VM.state.registers['$!'])
    draw(VM)
  }

}

function show_results_in_html(state) {
  registerDiv.innerHTML = "Registers: " + JSON.stringify(state.registers, undefined, 2).replaceAll("\"", "");
  var rows = ""
  var rowText = "";
  for (var i = 0; i < state.memory.length; i += 16) {
    rowText = "";
    // Print the actual memory
    var row = `<td>${i.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})}--</td>`
    for (var j = i; j < state.memory.length && j < i + 16; j += 1) {
        row += `<td class='show-memory-id-on-hover' memory-id='${state.memory_id[j]}'>${state.memory[j]}</td>`
    }
    // Print the memory string representation to the right of each row
    for (var k = i; k < state.memory.length && k < i + 16; k += 1) {
      if (state.memory[k] === '00') {
        rowText += " ";
      } else {
        rowText += `${String.fromCharCode(parseInt(state.memory[k],16))}`
      }
    }
    row += `<td>|   ${rowText}</td>`
    rows += `<tr>${row}</tr>`
  }
  memoryDiv.innerHTML = `<table id=memory-table>${rows}</table>`

  const tooltips = document.querySelectorAll(".show-memory-id-on-hover:not([memory-id=''])");

  tooltips.forEach(tooltip => {
    tooltip.addEventListener('mouseover', () => {
      const tooltipText = tooltip.getAttribute('memory-id');
      tooltips.forEach(el => {
        if (el.getAttribute('memory-id') === tooltipText) {
          el.classList.add('highlight-memory-id');
        }
      });
    });

    tooltip.addEventListener('mouseout', () => {
      tooltips.forEach(el => {
        el.classList.remove('highlight-memory-id');
      });
    });
  });
}

function get_virtual_machine(program) {
  if (_VirtualMachine == null) {
    _VirtualMachine = new VirtualMachine();
    _VirtualMachine.update_vm(program);
    return _VirtualMachine;
  }

  if (program === undefined) {
    return _VirtualMachine;
  }

  _VirtualMachine.update_vm(program)
  return _VirtualMachine;
}
/*
function get_pretty_printer(program) {
  if (_PrettyPrinter == null) {
    _PrettyPrinter = new PrettyPrinter();
    _PrettyPrinter.update_program(program);
    return _PrettyPrinter;
  }

  if (program === undefined) {
    return _PrettyPrinter;
  }

  _PrettyPrinter.update_program(program)
  return _PrettyPrinter;
}
*/

function reset_buttons_after_debug() {
    document.querySelector('#debugbutton').disabled = false;
    document.querySelector('#exitdebug').disabled = true;
    document.querySelector('#stepbutton').disabled = true;
    if (document.querySelector('.highlight-line') != null) {
      document.querySelector('.highlight-line').classList.remove('highlight-line');
    }
}

async function test_l(source_code){
  var program = await parse_and_read(source_code);
  if(program.error_msg !== null){
    console.log(program.error_msg);
    return;
  }
  get_virtual_machine(program);
  execute_all();
}