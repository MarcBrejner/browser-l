function asciiToBinary(str) {
    return atob(str)
}

function decode(encoded) {
    var binaryString =  asciiToBinary(encoded);
    var bytes = new Uint8Array(binaryString.length);
    for (var i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

var encoded_levels = new Array();
class L0Visitor {
    visit(node) {
        this._emitter.node_stack.push(node);
        if (this[node.type] === undefined) {
            var r = this.default(node);
            this._emitter.node_stack.pop();
            return r;
        } else {
            var r = this[node.type](node);
            this._emitter.node_stack.pop();
            return r;
        }
    }

    default(node) {
        if (node.childCount == 1) {
            return this.visit(node.child(0));
        } else {
            node.children.forEach(c => { this.visit(c) });
        }
    }

    comment(node) {
        return;
    }

    expression(node) {  
        switch (node.childCount) {
            case 1:
                var reader = this.visit(get_left_child(node));
                return this._emitter.expression(reader)
            case 2:
                var oper = get_operator(node).text;
                var reader =  this.visit(get_left_child(node));
                return this._emitter.unary_expression(oper, reader)
            case 3:
                var left_reader = this.visit(get_left_child(node));
                var oper = get_operator(node).text;
                var right_reader = this.visit(get_right_child(node));
                return this._emitter.binary_expression(left_reader, oper, right_reader);
        }
    }

    memory_expression(node) {
        return this.expression(node);
    }

    number(node) {
        var number = parseInt(node.text);
        return this._emitter.number(number);
    }

    constant(node) {
        var constant_id = node.text;
        return this._emitter.constant(constant_id);
    }

    data(node) {
        var data_id = node.text;
        return this._emitter.data(data_id);
    }

    register(node) {
        var register_id = node.text;
        return this._emitter.register(register_id);
    }

    memory(node) {
        var memory_id = this.visit(node.child(1));
        var datatype = get_datatype(node.child(3).text);
        return this._emitter.memory(memory_id, datatype);
    }

    assignment(node) {
        var is_conditional = node.child(1).text === "?=" ? true : false;
        var has_not = node.child(2).text === '!' ? true : false;
        var writer = this.visit(node.child(0));
        var expression = null
        if (has_not) {
          var expression = this.visit(node.child(3));
        } else {
          var expression = this.visit(node.child(2));
        }
        this._emitter.assignment(writer, expression, is_conditional, has_not);
    }

    constant_declaration(node) {
        let constant_id = node.child(1).text;
        let value = node.child(2).text;
        this._emitter.constant_declaration(constant_id,value);
    }

    data_declaration(node) {
        let data_id = node.child(1).text;
        let value = node.child(2).text;
        this._emitter.data_declaration(data_id,value);
    }   

    label(node) {
        var label_id = node.text;
        if(node.parent.type === 'statements'){
            this._emitter.set_label(label_id);
        }else{
            return this._emitter.get_label(label_id);
        }
    }

    syscall(node) {
        this._emitter.syscall();
    }
}

class L0Emitter {
    _data = {};
    _const = {};
    _labels = {};
    _statements = [];

    expression(reader){
        return new Expression(CONTENT_TYPES.EXPRESSION, reader);
    }

    unary_expression(oper, reader){
        return new Expression(CONTENT_TYPES.UN_EXPRESSION, reader, oper);
    }

    binary_expression(left_reader, oper, right_reader){
        if (left_reader.type === CONTENT_TYPES.MEMORY && right_reader.type === CONTENT_TYPES.MEMORY) {
            this.assignment(this.register('$x'), left_reader);
            this.assignment(this.register('$y'), right_reader);
            left_reader = this.register('$x');
            right_reader = this.register('$y');
        }

        return new Expression(CONTENT_TYPES.BIN_EXPRESSION, left_reader, oper,  right_reader);
    }

    number(number) {
        return new Content(CONTENT_TYPES.NUMBER, number);
    }

    constant(constant_id) {
        return new Content(CONTENT_TYPES.CONSTANT, constant_id);
    }

    data(data_id) {
        return new Content(CONTENT_TYPES.DATA, data_id);
    }

    register(register_id) {
        return new Content(CONTENT_TYPES.REGISTER, register_id);
    }

    memory(memory_id, datatype) {
        return new Content(CONTENT_TYPES.MEMORY, memory_id, datatype);
    }

    constant_declaration(constant_id, constant_value) {
        this._const[constant_id] = constant_value;
    }

    data_declaration(data_id, data_value) {
        this._data[data_id] = data_value;
    }   

    set_label(label_id) {
        this._labels[label_id] = this._statements.length;
    }

    get_label(label_id) {
        return new Content(CONTENT_TYPES.LABEL, label_id);
    }

    syscall() {
        this.push_statement(new ByteCode(OP.SYSCALL));
    }


    assignment(writer, expression, is_conditional=false, has_not=false) {
        this.push_statement(new ByteCode(get_opcode(expression), [is_conditional, has_not, writer].concat(convert_content_to_array(expression))));
    }

    push_statement(byte_code) {
        this._statements.push(byte_code);
        this._drawer.node_ECS.push(this.node_stack.peek());
    }

    node_stack = {
        stack: [],
    
        push(node) {
            this.stack.push(node);
        },
    
        pop() {
            if (this.stack.length == 0)
                return "Underflow";
            return this.stack.pop();
        },
    
        peek(){
            return this.stack[this.stack.length-1];
        }
    };
}

class L0Draw {
    constructor(){
        this.node_ECS = new Array();
    }

    draw(vm){
        this.pretty_print(vm);
        this.color(vm);
        this.show_results(vm.state)
    }

    pretty_print(vm) {
        this.program = vm.program;
        this.state = vm.state;
        var pretty_window = document.getElementById("prettyPretty");

        if(this.program.error_msg !== null){
          pretty_window.innerHTML = this.program.error_msg;
          return;
        }

        var pretty_source_code = "";
        var instructions = this.program.instructions;

        var debugging = document.querySelector('#debugbutton').disabled;
        for (var i = 0; i < instructions.length; i++) {
          var res = `<span id=line-number>${i} </span>` + instructions[i].handle(this) + this.print_labels(i) +`<br>`;
          if (!debugging || this.state === undefined) {
            pretty_source_code += res;
          } else {
            if (i === this.state.registers['$!']) {
              pretty_source_code +=
                  `<span class=highlight-line>${res}</span>`
            } else {
              pretty_source_code += res
            }
          }
        }
        var result = this.get_labels_after_statements(instructions.length);
        var unique_result = [...new Set(result)]
        var res = ""
        unique_result.forEach(label => {
          res = `<span id=line-number>${label}</span> ` + this.print_labels(label) +`<br>`;
          if (!debugging || this.state === undefined) {
            pretty_source_code += res;
          } else {
            if (label === this.state.registers['$!']) {
              pretty_source_code +=
                  `<span class=highlight-line>${res}</span>`
            } else {
              pretty_source_code += res
            }
          }
        })
        
        pretty_window.innerHTML = pretty_source_code;
      }

      get_labels_after_statements(last_instruction_index) {
        var result = Object.values(this.program.labels).filter(value => value >= last_instruction_index);
        return result; 
      }
    
      syscall() { return `<span style='color: red'>syscall;</span>\n` }
    
      assign_binary(conditional, has_not, writer, reader1, opr, reader2) {
        var cond = conditional ? '?=' : ':=';
        var not = "";
        if (has_not) {
          not = this.wrap_not();
        }
        return `${this.wrap_assign(this.print_content(writer))} ${this.wrap_opr(cond)} ${not} ${this.wrap_assign(this.print_content(reader1))} ${this.wrap_opr(opr)} ${this.wrap_assign(this.print_content(reader2))}${this.wrap_semicolon()}\n`
      }
    
      assign_unary(conditional, has_not, writer, opr, reader) {
        var cond = conditional ? '?=' : ':=';
        var not = "";
        if (has_not) {
          not = this.wrap_not();
        }
        return `${this.wrap_assign(this.print_content(writer))} ${this.wrap_opr(cond)} ${not} ${this.wrap_opr(opr)} ${this.wrap_assign(this.print_content(reader))}${this.wrap_semicolon()}\n`
      }
    
      assign(conditional, has_not, writer, reader) {
        var cond = conditional ? '?=' : ':=';
        var not = "";
        if (has_not) {
          not = this.wrap_not();
        }
        return `${this.wrap_assign(this.print_content(writer))} ${this.wrap_opr(cond)} ${not} ${this.wrap_assign(this.print_content(reader))}${this.wrap_semicolon()}\n`
      }
    
      wrap_assign(assign) {
        return `<span id=assign>${assign}</span>`;
      }
    
      wrap_opr(opr) {
        return `<span id=opr>${opr}</span>`;
      }
    
      wrap_semicolon() {
        return `<span id=semicolon>;</span>`;
      }
    
      wrap_const(constant) {
        return `<span id=constant>${constant}</span>`;
      }
    
      wrap_label(label) {
        return `<span id=label>${label}</span>`;
      }

      wrap_not() {
        return `<span id=not>!</span>`
      }
    
      print_content(content){
        if (content.type === CONTENT_TYPES.CONSTANT){
          return `${this.wrap_const(`${content.id} (${this.program.constants[content.id]})`)}`
        } else if (content.type == CONTENT_TYPES.LABEL) {
          return this.wrap_label(content.id);
        }else if(content.type == CONTENT_TYPES.MEMORY){
          return this.print_memory(content);
        }else{
          return `${content.id}`
        }
      }
    
      print_memory(content) {
        if (content.id.type === CONTENT_TYPES.BIN_EXPRESSION) {
          return `[${content.id.reader1.get_text()} ${content.id.opr} ${content.id.reader2.get_text()},${content.datatype.type}${content.datatype.size}]`
        }
        else {
          return `[${content.get_text()},${content.datatype.type}${content.datatype.size}]`
        }
      }
    
      print_labels(i){
        var labels = getKeyByValueIfValueExists(this.program.labels, i);
        if (labels.length === 0) return "";
        var result = "<span id=label>";
        labels.forEach(label => {
          result += `${label} `
        })
        result += "</span>";
        return result;
      }
      
      color(vm){
        var pc = vm.state.registers["$!"];
        if(pc >= vm.program.instructions.length){
            return;
        }
        clear_highlights()
        const start = {line: this.node_ECS[pc].startPosition.row , ch: this.node_ECS[pc].startPosition.column}
        const end = {line: this.node_ECS[pc].endPosition.row , ch: this.node_ECS[pc].endPosition.column}
        codeMirrorEditor.markText(start, end, { className: 'highlight-line' });
      }

      show_results(state) {
        
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
      
    
}
encoded_levels.push(decode('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AAAAAAAAAAAAAAAAAAAAAAEAAgADAAQABQAGAAcACAAJAAoACwAMAA0ADgAPABAAEQASABMAFAAVABYAFwAYABkAGgAbABwAHQAeAB8AIAAhACIAIwAkACUAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEAAAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAAAAEAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAFAAAAAAAAAAAABwAAAAAAAAAAAAAACQALAA0AAAAAAAAAAAAtAAQALAAnACcAHQAlADAAAAAAABsAAAAAABkAAwAGAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAMAAAAAAAAAAQEAAAAAAAAAADEAAAAAAAEBAAAAAAAAAAAyAAAAAAABAQAAAAAAAAAADgAAAAAAAQEAAAAAAAAAAAsAAAAAAAEBAAAAAAAAAAAZAAAAAAABAQAAAAAAAAAAMAAAAAAAAQEAAAAAAAAAAAUAAAAAAAEBAAAAAAAAAAAKAAAAAAABAQAAAAAAAAAAFwAAAAAAAQEAAAAAAAABARcAAAAAAAEBAAAAAAAAAQEbAAAAAAABAQAAAAAAAAECJQAAAAAAAgEAAAAAAAABAiUAAAAAAAAADgAAAQAAAgEAAAAAAAABAiUAAAAAAAAACwAAAQAAAgEAAAAAAAABAiUAAAAAAAAAGQAAAQAAAgEAAAAAAAABAiUAAAAAAAAAMAAAAQAAAgEAAAAAAAABAiQAAAAAAAAAMQAAAQAAAgEAAAAAAAABAiQAAAAAAAAAMgAAAQAAAQEAAAAAAAABAiQAAAAAAAEBAAAAAAAAAAATAAAAAAABAAAAAAAAAAECJQAAAAAAAQAAAAAAAAAAABAAAAAAAAEBAAAAAAAAAQMlAAAAAAABAQAAAAAAAAAAEgAAAAAAAQAAAAAAAAABAyUAAAAAAAEAAAAAAAAAAAAPAAAAAAABAQAAAAAAAAAAGAAAAAAAAQEAAAAAAAABBCUAAAAAAAEBAAAAAAAAAAAVAAAAAAABAAAAAAAAAAEEJQAAAAAAAQEAAAAAAAABAyQAAAAAAAEBAAAAAAAAAQUlAAAAAAABAQAAAAAAAAEFIwAAAAAAAQEAAAAAAAABAR8AAAAAAAEAAAAAAAAAAQEiAAAAAAABAQAAAAAAAAEBIAAAAAAAAQEAAAAAAAABAR4AAAAAAAEBAAAAAAAAAAAJAAAAAAABAQAAAAAAAAAAAgAAAAAAAQAAAAAAAAAAACEAAAAAAAEAAAAAAAAAAAAUAAAAAAABAQAAAAAAAAEBFgAAAAAAAQEAAAAAAAABAx0AAAAAAAEBAAAAAAAAAQMZAAAAAAABAQAAAAAAAAEDGgAAAAAAAQEAAAAAAAAAACoAAAAAAAEBAAAAAAAAAAAhAAAAAAABAQAAAAAAAAAAIAAAAAAAAQEAAAAAAAAAAB8AAAAAAAEBAAAAAAAAAAAMAAAAAAABAQAAAAAAAAECFgAAAAAAAQEAAAAAAAABARgAAAAAAAEBAAAAAAAAAAANAAAAAAABAQAAAAAAAAAAEQAAAAAAAQEAAAAAAAAAABYAAAAAAAEBAAAAAAAAAQMhAAAAAAABAQAAAAAAAAAAKQAAAAAAAQEAAAAAAAACAAAAAAAAAAEBAAAAAAAAAQQdAAAAAAABAQAAAAAAAAECHgAAAAAAAQEAAAAAAAABARwAAAAAAAEBAAAAAAAAAAAkAAAAAAABAQAAAAAAAAAAIwAAAAAAAQEAAAAAAAABAx4AAAAAAG1lbW9yeQBjb25zdABhc3NpZ25tZW50AGNvbW1lbnQAc3RhdGVtZW50AGNvbnN0YW50AHN0YXRlbWVudHMAZGVjbGFyYXRpb25zAG9wZXJhdG9yAHJlZ2lzdGVyAHdyaXRlcgBtZW1vcnlfcmVhZGVyAG51bWJlcgBjb25zdGFudF9kZWNsYXJhdGlvbgBkYXRhX2RlY2xhcmF0aW9uAG1lbW9yeV9leHByZXNzaW9uAHN5c2NhbGwAbGFiZWwAc3RyaW5nAHR5cGUAc291cmNlX2ZpbGUAZW5kAGRhdGEAXQBbAD89ADo9ADsAc3RhdGVtZW50c19yZXBlYXQxAGRlY2xhcmF0aW9uc19yZXBlYXQxAC0ALAAhAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAAAB4AAAAAAAAAHgAAAB4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAIAAAAAgAAAAAAAAAIAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA0AAAAmAAAAAAAAABYAAAAAAAAANAAAAAIAAAABAAAAAAAAAAUAAACQBQAAAAAAAOADAAAwBgAAAA0AAAAAAAAAAAAAAAAAALAEAAAwBQAAfAUAAH4FAACgCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE8LAABiCwAAkgsAAH8KAABTCwAAXwsAAFwLAACQCwAAjAsAAFoLAACOCwAAWAsAAD4LAACiCgAAUwsAADELAADMCgAAKQsAAMMKAADqCgAANwsAAJAKAABDCwAAtgoAAAsLAADxCgAABgsAAKsKAACYCgAAhQoAAB4LAADjCgAA1QoAABcLAADcCgAAeAoAAHcLAABkCwAA'));
class L1Visitor extends L0Visitor {  
    goto(node) {
        var reader = node.child(1);
        var pos = this.visit(reader);
        this._emitter.goto(pos)
    }
}

class L1Emitter extends L0Emitter{
    goto(pos){
        this.assignment(
            this.register('$!'), 
            this.binary_expression(pos, '-', this.number(1)),
            true);
    }
}

class L1Draw extends L0Draw{
    constructor(){
        super();
    }

    draw(vm){
        super.draw(vm);
        return;
    }
}
encoded_levels.push(decode('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EgAZAAEAJAAdAAEAIAAqAAEAHwAwAAUADQAOAA8AEAATAAYACQABAAkAMgABABIAGQABACQAHQABACAAMAABAB8AMAAFAA0ADgAPABAAEwAIAAcAAQAIAAkAAQAJAA0AAQAQAA8AAQARABcAAQAkABwAAQAhACUAAQAcADMAAgAdAB4ABAATAAEAAAA0AAEAAgA4AAEAFQA2AAUACAAJAA8AEAARAAQACQABAAkAGQABACQAMQABACAAMAAFAA0ADgAPABAAEwAEAAkAAQAJABkAAQAkADUAAQAgADAABQANAA4ADwAQABMABAA6AAEAAAA8AAEAAgBAAAEAFQA+AAUACAAJAA8AEAARAAMAQgABAAAARAABAAIARgAFAAgACQAPABAAEQADADoAAQAAADwAAQACAD4ABQAIAAkADwAQABEAAQBIAAcAAwAEAAgACQAPABAAEQABAEIABgAAAAgACQAPABAAEQABAEoABgAAAAgACQAPABAAEQADABoAAQAjACYAAQAiAEwABAANAA4AEAATAAEAOgAGAAAACAAJAA8AEAARAAIALQABACMATAAEAA0ADgAQABMAAQBOAAQAAQAFAAYAEgABAFAAAgAFAAYAAQBSAAIACgASAAEAVAACAAEAEgACAFYAAQAKAFgAAQASAAEAWgACAA8AEAABAFwAAgAFAAYAAgBeAAEAAQBgAAEAEgABAGIAAQAAAAEAZAABAAEAAQBmAAEAAQABAGgAAQAMAAEAagABAA0AAQBsAAEAAgABAG4AAQAAAAEAcAABAAEAAQByAAEACgABAHQAAQABAAEAdgABABQAAQB4AAEAEwABAHoAAQABAAEAfAABAAEAAQB+AAEACwABAIAAAQAKAAEAggABAAEAAQCEAAEAAQABAIYAAQABAAEAiAABAAEAAQCKAAEAAAABAIwAAQABAAEAjgABAA4AAQCQAAEAAQAAAAAAAAAAACMAAABGAAAAaQAAAIEAAACZAAAAswAAAMoAAADkAAAA9QAAAAYBAAAXAQAAKAEAADYBAABEAQAATgEAAFcBAABgAQAAbQEAAHYBAACAAQAAhwEAAIwBAACRAQAAlgEAAJ0BAACiAQAApwEAAK4BAACyAQAAtgEAALoBAAC+AQAAwgEAAMYBAADKAQAAzgEAANIBAADWAQAA2gEAAN4BAADiAQAA5gEAAOoBAADuAQAA8gEAAPYBAAD6AQAA/gEAAAICAAAGAgAACgIAAAABAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAAAAAAAAAAAAAAAAAAAAAAAAAABAAIAAwAEAAUABgAHAAgACQAKAAsADAANAA4ADwAQABEAEgATABQAFQAWABcAGAAZABoAGwAcAB0AHgAfACAAIQAiACMAJAAlACYAAAAAAAAAAAAAAAAAAAAAAAAAAQABAAAAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAFAAAAAAAAAAcACQAAAAAAAAAAAAAACwANAA8AAAAAAAAAAAAyAAIALwAuAC4AHgArADMAMwAAAAAAHAAAAAAAFwAGAAMAAAAAAAAAAAAAAAAAAQAAAAAAAAADAAAAAAAAAAEBAAAAAAAAAAAiAAAAAAABAQAAAAAAAAAANAAAAAAAAQEAAAAAAAAAABsAAAAAAAEBAAAAAAAAAAATAAAAAAABAQAAAAAAAAAACQAAAAAAAQEAAAAAAAAAABcAAAAAAAEBAAAAAAAAAAAzAAAAAAABAQAAAAAAAAEBGwAAAAAAAQEAAAAAAAABAiYAAAAAAAIBAAAAAAAAAQImAAAAAAAAABsAAAEAAAIBAAAAAAAAAQImAAAAAAAAABMAAAEAAAIBAAAAAAAAAQImAAAAAAAAAAkAAAEAAAIBAAAAAAAAAQImAAAAAAAAABcAAAEAAAIBAAAAAAAAAQImAAAAAAAAADMAAAEAAAIBAAAAAAAAAQIlAAAAAAAAACIAAAEAAAIBAAAAAAAAAQIlAAAAAAAAADQAAAEAAAEBAAAAAAAAAQIlAAAAAAABAQAAAAAAAAEBFwAAAAAAAQEAAAAAAAAAAAgAAAAAAAEBAAAAAAAAAAAZAAAAAAABAAAAAAAAAAAACwAAAAAAAQEAAAAAAAAAABQAAAAAAAEAAAAAAAAAAQImAAAAAAABAAAAAAAAAAAADwAAAAAAAQEAAAAAAAABAyYAAAAAAAEBAAAAAAAAAAARAAAAAAABAAAAAAAAAAEDJgAAAAAAAQAAAAAAAAAAAA4AAAAAAAEBAAAAAAAAAQQmAAAAAAABAQAAAAAAAAAAEgAAAAAAAQAAAAAAAAABBCYAAAAAAAEBAAAAAAAAAQMlAAAAAAABAQAAAAAAAAEFJgAAAAAAAQEAAAAAAAAAABgAAAAAAAEBAAAAAAAAAQUkAAAAAAABAQAAAAAAAAEBIQAAAAAAAQAAAAAAAAABASMAAAAAAAEBAAAAAAAAAQEgAAAAAAABAAAAAAAAAAAAIQAAAAAAAQAAAAAAAAAAABUAAAAAAAEBAAAAAAAAAAAnAAAAAAABAQAAAAAAAAAABwAAAAAAAQEAAAAAAAABAR8AAAAAAAEBAAAAAAAAAAAMAAAAAAABAQAAAAAAAAEBFgAAAAAAAQEAAAAAAAABAxkAAAAAAAEBAAAAAAAAAQMaAAAAAAABAQAAAAAAAAAALAAAAAAAAQEAAAAAAAAAACkAAAAAAAEBAAAAAAAAAAAQAAAAAAABAQAAAAAAAAECFgAAAAAAAQEAAAAAAAAAAA0AAAAAAAEBAAAAAAAAAAAhAAAAAAABAQAAAAAAAAECHgAAAAAAAQEAAAAAAAAAACAAAAAAAAEBAAAAAAAAAAAfAAAAAAABAQAAAAAAAAEDHQAAAAAAAQEAAAAAAAAAAAoAAAAAAAEBAAAAAAAAAAAWAAAAAAABAQAAAAAAAAEDIgAAAAAAAQEAAAAAAAABARgAAAAAAAEBAAAAAAAAAAAjAAAAAAABAQAAAAAAAAEEHQAAAAAAAQEAAAAAAAABAh8AAAAAAAEBAAAAAAAAAgAAAAAAAAABAQAAAAAAAAEBHAAAAAAAAQEAAAAAAAAAACgAAAAAAAEBAAAAAAAAAQMfAAAAAABtZW1vcnkAY29uc3QAYXNzaWdubWVudABjb21tZW50AHN0YXRlbWVudABjb25zdGFudABzdGF0ZW1lbnRzAGRlY2xhcmF0aW9ucwBvcGVyYXRvcgByZWdpc3RlcgB3cml0ZXIAbWVtb3J5X3JlYWRlcgBudW1iZXIAZ290bwBjb25zdGFudF9kZWNsYXJhdGlvbgBkYXRhX2RlY2xhcmF0aW9uAG1lbW9yeV9leHByZXNzaW9uAHN5c2NhbGwAbGFiZWwAc3RyaW5nAHR5cGUAc291cmNlX2ZpbGUAZW5kAGRhdGEAXQBbAD89ADo9ADsAc3RhdGVtZW50c19yZXBlYXQxAGRlY2xhcmF0aW9uc19yZXBlYXQxACwAIQAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAAAAAAAHwAAAAAAAAAAAAAAHwAAAB8AAAAfAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA0AAAAnAAAAAAAAABYAAAAAAAAANgAAAAIAAAABAAAAAAAAAAUAAADQBQAAAAAAACAEAABwBgAAkA0AAAAAAAAAAAAAAAAAAPAEAABwBQAAvgUAAMAFAAAgDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANwLAADvCwAAHQwAAAcLAADgCwAA7AsAAOkLAAAbDAAAeQsAAOcLAAAZDAAA5QsAAMsLAAAqCwAA4AsAAL4LAABUCwAAtgsAAEsLAAByCwAAxAsAABgLAADQCwAAPgsAAJgLAAB+CwAAkwsAADMLAAAgCwAADQsAAHkLAACrCwAAawsAAF0LAACkCwAAZAsAAAALAAAEDAAA8QsAAA=='));
class L2Visitor extends L1Visitor {
    scope(node) {
        this._emitter.start_scope();
        this.visit(node.child(1));
        this._emitter.end_scope();
    }

    variable(node)  {
        var var_name = node.child(0).text;
        var var_size = node.child(2).text;
        var has_not = node.child(4).text === '!' ? true : false;
        var expression = null;
        if (has_not) {
            var expression = this.visit(node.child(5));
          } else {
            var expression = this.visit(node.child(4));
          }
        return this._emitter.variable(var_name, var_size, expression, has_not);
    }

    variable_name(node) {
        var var_name = node.text;

        return this._emitter.variable_name(var_name);
    }
}

class L2Emitter extends L1Emitter{
    variables = {}
    head = null
    stack_pointer = 128;
    frame_pointer = 128;
    in_scope = false;

    variable(var_name, var_size, expression, has_not = false) {
        if (this.in_scope) {
            this.create_temp_var(var_name, var_size, expression, has_not);
        } else {
            this.variable_declaration(var_name, var_size, expression, has_not)
        }
    }

    variable_name(var_name) {
        if (this.in_scope) {
            return this.read_temp_var(var_name);
        } else {
            var p_var = '&_' + var_name;
            return this.memory(this.data(p_var), get_datatype(this.variables[p_var]));
        }
    }

    create_temp_var(var_name, var_size, expression, has_not) {
        var variable_size = get_variable_bytesize(var_size);
        this.frame_pointer -= variable_size;
        this.head.variables[var_name] = [this.stack_pointer - this.frame_pointer, var_size];
        var writer = this.read_temp_var(var_name);
        this._drawer.variable_states[this._statements.length] = [structuredClone(this.variables), structuredClone(this.head)];
        this.assignment(writer, expression, false, has_not);
    }

    read_temp_var(var_name) {
        var current = this.head;
        while (current != null) {
            if (var_name in current.variables) {
                return this.memory(this.binary_expression(this.register('$fp'), '-', this.number(current.variables[var_name][0])), get_datatype(current.variables[var_name][1]))
            }   
            current = current.next;
        }
        // TODO: check if node.text is in variable dict otherwise return error
        var p_var = '&_' + var_name;
        return this.memory(this.data(p_var), get_datatype(this.variables[p_var]));
    }

    start_scope() {
        var frame = new StackFrame();
        frame.next = this.head;
        this.head = frame;
        this.in_scope = true;

        this.Stack.push(this.frame_pointer);
    }

    end_scope(update_final_state = true) {
        var offset = this.Stack.pop() - this.frame_pointer;
        this.head = this.head.next;
        this.frame_pointer += offset;
        if (this.head === null) {
            this.in_scope = false;
        }

        //Because exiting the scope is not part of the bytecode instruction, the new variables are only reflected when the next instruction is drawn.
        //To fix this, the state of the previous instruction, which is the final instruction before the scope ends, is updated to reflect this change.
        if(update_final_state){
            this._drawer.variable_states[this._statements.length - 1] = [structuredClone(this.variables), structuredClone(this.head)];
        }else{
            this._drawer.variable_states[this._statements.length] = [structuredClone(this.variables), structuredClone(this.head)];
        }
        
    }

    variable_declaration(var_name, var_size, expression, has_not) {
        var p_var = '&_' + var_name;
        this.variables[p_var] = var_size;
        var memory_allocation = "";

        for (var i = 0; i < get_variable_bytesize(var_size); i++) {
            memory_allocation += "0";
        }

        this._data[p_var] = memory_allocation;
        this._drawer.variable_states[this._statements.length] = [structuredClone(this.variables), null];
        this.assignment(
            this.memory(this.data(p_var), get_datatype(var_size)), 
            expression, false, has_not);
    }

    Stack = {
        items: [],
    
        push(element)
        {
            this.items.push(element);
        },
    
        pop()
        {
            if (this.items.length == 0)
                return "Underflow";
            return this.items.pop();
        }
    }

    set_state() {

    }
}


class StackFrame {
    next;
    variables;
    constructor() {
        this.next= null;
        this.variables = {};
    }
}

class L2Draw extends L1Draw{
    constructor(){
        super();
        this.variable_states = {};
    }

    draw(vm) {
        super.draw(vm);

        var container = document.getElementById("lx-container");

        var existingContainer = document.getElementById("table-wrapper-container");
        if (existingContainer) {
          container.removeChild(existingContainer);
        }

        var state = this.find_state(this.variable_states, vm.state.registers['$!']-1)
        if(this.is_empty_state(state)){
            return;
        }
        var wrapperContainer = document.createElement("div");
        wrapperContainer.id = "table-wrapper-container";

        

        var variables = state[0]
        if (Object.keys(variables).length !== 0) {
            this.create_wrapper(variables, vm, wrapperContainer)
        }
        var stack_head = state[1];

        // save the stack in an array in order to print it from the bottom of the stack
        var temp_var_stack = [];
        while (stack_head != null) {
            temp_var_stack.push(stack_head);
            stack_head = stack_head.next;
        }
        for (var i = temp_var_stack.length-1; i >= 0; i--) {
            if(Object.keys(temp_var_stack[i].variables).length > 0){
                this.create_wrapper(temp_var_stack[i].variables, vm, wrapperContainer)
            }
        }
        
        container.appendChild(wrapperContainer)

    }

    create_wrapper(variables, vm, container){
        var table = this.create_table_from_variables(variables, vm)
        var tableWrapper = document.createElement("L2Div");
        tableWrapper.style.display = "block";
        tableWrapper.appendChild(table);
        
        tableWrapper.style.border = "1px solid black";
        tableWrapper.style.padding = "10px";
        tableWrapper.style.width = "150px";
        tableWrapper.style.textAlign = "center";
        tableWrapper.style.borderCollapse = "collapse";
        container.appendChild(tableWrapper);
    }

    create_table_from_variables(variables, vm){
        var table = document.createElement("L2Table");
        for(var name in variables){
            var row = document.createElement("tr");

            var nameCell = document.createElement("td");
            var newName = name;
            if(!isNaN(name)){
                var offset = vm.memorySize-parseInt(name);
                newName = "$fp - "+offset;
            }
            nameCell.textContent = newName;
            nameCell.style.borderRight = "2px solid black";
            nameCell.style.paddingRight = "10px"
            row.appendChild(nameCell);


            var value = variables[name];
            var valueCell = document.createElement("td");
            var memory_access;
            //Check if scoped
            if(Array.isArray(value)){
                memory_access = new Content(CONTENT_TYPES.MEMORY, new Content(CONTENT_TYPES.NUMBER, vm.memorySize-value[0]), get_datatype(value[1]));
            }else{
                memory_access = new Content(CONTENT_TYPES.MEMORY, new Content(CONTENT_TYPES.DATA, name), get_datatype(value));
            }
            
            valueCell.textContent = vm.read(memory_access);
            valueCell.style.paddingLeft = "10px"
            row.appendChild(valueCell);
            table.appendChild(row);
        }

        return table
    }

    find_state(map, key) {
        let result = map[key];
        let currentKey = key;

        while(result === undefined){
            currentKey -= 1;
            result = map[currentKey];
            if(currentKey <= 0){
                result = null;
                break;
            }
        }
        return result;
      }
      
    is_empty_state(state) {
        if (state == null) {
            return true;
        }

        if (Object.keys(state[0]).length !== 0) {
            return false;
        }

        if (this.is_empty_stack(state[1])) {
            return true;
        }

        return false;
    }

    is_empty_stack(stack) {
        var current = stack;
        var is_empty = true;
        while (current != null) {
            if (Object.keys(current.variables).length !== 0) {
                is_empty = false;
                break;
            }   
            current = current.next;
        }
        return is_empty;
    }
}
encoded_levels.push(decode('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GyEDDAkLQQAhBAtBJiEDDAcLQSwhAwwGC0EZIQMMBQtBLyEDDAQLQSwhAwwDC0EBIQNBASEEDAILQS4hAwwBC0EUIQMLIAAgBCAAKAIIEQUADAALAAsLoyYBACMAC5wmDwAHAAEABQAJAAEACgALAAEADQANAAEAEwAPAAEAFAARAAEAFQATAAEAGQADAAEALgAQAAEAIgARAAEAIwAkAAEALAAlAAEAKQAxAAEAIQAVAAIAAAAGAC4AAwAkACUAJgAPABkAAQAFABwAAQAKAB8AAQANACIAAQATACUAAQAUACgAAQAVACsAAQAZAAMAAQAuABAAAQAiABEAAQAjACQAAQAsACUAAQApADEAAQAhABcAAgAAAAYALgADACQAJQAmAA8ABwABAAUACQABAAoACwABAA0ADQABABMADwABABQAEQABABUAEwABABkAAgABAC4AEAABACIAEQABACMAJAABACwAJQABACkAMQABACEAPgABACAALgADACQAJQAmAA8ABwABAAUACQABAAoACwABAA0ADQABABMADwABABQAEQABABUAEwABABkAAgABAC4AEAABACIAEQABACMAJAABACwAJQABACkAJwABACAAMQABACEALgADACQAJQAmAAwABwABAAUACQABAAoACwABAA0ADwABABQAEQABABUAEwABABkACwABACIAEQABACMAJAABACwAJQABACkAOQABACEALgADACQAJQAmAAcAAwABAAMABQABAAQACAABAC0ALAABAB0ALQACAB4AHwAwAAMACgAVABkALgAEAAUADQATABQABwAyAAEAAwA1AAEABAAIAAEALQAsAAEAHQAtAAIAHgAfADoAAwAKABUAGQA4AAQABQANABMAFAAHAAsAAQANADwAAQAJAEAAAQAWACIAAQAoACMAAQAsAEEAAQAnAD4ABgARABIAEwAUABcAGQAHAAsAAQANAEAAAQAWAEIAAQAJACIAAQAoACMAAQAsADQAAQAnAD4ABgARABIAEwAUABcAGQAEABcAAQAAAEQAAQACAEgAAQAaAEYACAAFAAYACgANABMAFAAVABkABgALAAEADQBAAAEAFgAiAAEAKAAjAAEALABDAAEAJwA+AAYAEQASABMAFAAXABkABgALAAEADQBAAAEAFgAiAAEAKAAjAAEALAA7AAEAJwA+AAYAEQASABMAFAAXABkABABKAAEAAABMAAEAAgBQAAEAGgBOAAgABQAGAAoADQATABQAFQAZAAIAUgACAAAAAgBUAAkABQAGAAoADQATABQAFQAZABoABABWAAEAAABYAAEAAgBcAAEAGgBaAAgABQAGAAoADQATABQAFQAZAAIAXgACAAAAAgBgAAkABQAGAAoADQATABQAFQAZABoAAwBiAAEAAABkAAEAAgBmAAgABQAGAAoADQATABQAFQAZAAMAFwABAAAARAABAAIARgAIAAUABgAKAA0AEwAUABUAGQADAEoAAQAAAEwAAQACAE4ACAAFAAYACgANABMAFAAVABkAAgBGAAMACgAVABkAFwAGAAAABQAGAA0AEwAUAAIAagADAAoAFQAZAGgABgAAAAUABgANABMAFAAEAAsAAQANACMAAQAsAEIAAQAoAD4ABgARABIAEwAUABcAGQACAGYAAwAKABUAGQBiAAYAAAAFAAYADQATABQABAALAAEADQAjAAEALAA8AAEAKAA+AAYAEQASABMAFAAXABkAAgBuAAQABQANABMAFABsAAUAAwAEAAoAFQAZAAIATgADAAoAFQAZAEoABgAAAAUABgANABMAFAADACEAAQArADoAAQAqAHAABAARABIAFAAXAAIANwABACsAcAAEABEAEgAUABcAAQByAAQAAQAHAAgAFgABAHQAAgATABQAAQB2AAIADgAWAAIAeAABAA4AegABABYAAgB8AAEAAQB+AAEAFgABAIAAAgABABYAAQCCAAIABwAIAAEAhAACAAcACAABAIYAAQALAAEAiAABAAAAAQCKAAEAAQABAIwAAQAAAAEAjgABABAAAQCQAAEAFwABAJIAAQABAAEAlAABAAEAAQCWAAEAAQABAJgAAQAMAAEAmgABAAAAAQCcAAEAAQABAJ4AAQARAAEAoAABAAIAAQCiAAEAAQABAKQAAQABAAEApgABAA8AAQCoAAEADgABAKoAAQAQAAEArAABAAEAAQCuAAEADgABALAAAQABAAEAsgABAAEAAQC0AAEAAQABALYAAQAGAAEAuAABABgAAQC6AAEAEgABALwAAQABAAEAvgABAAEAAQDAAAEAAQAAAAAAAAAAAAAAMQAAAGIAAACSAAAAwgAAAOkAAAAFAQAAIQEAADwBAABXAQAAawEAAIMBAACbAQAArwEAAL8BAADTAQAA4wEAAPQBAAAFAgAAFgIAACQCAAAyAgAARAIAAFICAABkAgAAcgIAAIACAACNAgAAlwIAAJ4CAACjAgAAqAIAAK8CAAC2AgAAuwIAAMACAADFAgAAyQIAAM0CAADRAgAA1QIAANkCAADdAgAA4QIAAOUCAADpAgAA7QIAAPECAAD1AgAA+QIAAP0CAAABAwAABQMAAAkDAAANAwAAEQMAABUDAAAZAwAAHQMAACEDAAAlAwAAKQMAAC0DAAAxAwAANQMAADkDAAAAAAAAAAAAAAABAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAAAAAAAAAAAAAAAAQACAAMABAAFAAYABwAIAAkACgALAAwADQAOAA8AEAARABIAEwAUABUAFgAXABgAGQAaABsAHAAdAB4AHwAgACEAIgAjACQAJQAmACcAKAApACoAKwAsAC0ALgAAAAAAAAAAAAAAAAAAAAAAAAABAAEAAAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAAAAQABAAEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAFAAcAAAAAAAAAAAAJAAAAAAALAAAAAAAAAAAAAAANAA8AEQAAAAAAAAATAAAAKQAFACwALQAtADAAMQAQABEALgAuAC4AAAAAACUAAAAAACQABwACAAAAAAAAAAAAAAAAAAEAAAAAAAAAAwAAAAAAAAABAAAAAAAAAAAAMgAAAAAAAQAAAAAAAAAAAEAAAAAAAAEBAAAAAAAAAAAEAAAAAAABAAAAAAAAAAAAHwAAAAAAAQEAAAAAAAAAABwAAAAAAAEBAAAAAAAAAAAGAAAAAAABAQAAAAAAAAAAJAAAAAAAAQAAAAAAAAAAAC4AAAAAAAEAAAAAAAAAAAAmAAAAAAABAQAAAAAAAAEBIAAAAAAAAQEAAAAAAAABAi4AAAAAAAIBAAAAAAAAAQIuAAAAAAAAAAQAAAEAAAIAAAAAAAAAAQIuAAAAAAAAAB8AAAEAAAIBAAAAAAAAAQIuAAAAAAAAABwAAAEAAAIBAAAAAAAAAQIuAAAAAAAAAAYAAAEAAAIBAAAAAAAAAQIuAAAAAAAAACQAAAEAAAIAAAAAAAAAAQIuAAAAAAAAAC4AAAEAAAIAAAAAAAAAAQIuAAAAAAAAACYAAAEAAAEBAAAAAAAAAQEcAAAAAAABAAAAAAAAAAEBHAAAAAAAAgAAAAAAAAABAi0AAAAAAAAAMgAAAQAAAgAAAAAAAAABAi0AAAAAAAAAQAAAAQAAAQEAAAAAAAABAi0AAAAAAAEAAAAAAAAAAQItAAAAAAABAQAAAAAAAAAADAAAAAAAAQEAAAAAAAAAACMAAAAAAAEAAAAAAAAAAAAZAAAAAAABAQAAAAAAAAAADQAAAAAAAQEAAAAAAAAAABsAAAAAAAEAAAAAAAAAAQIuAAAAAAABAAAAAAAAAAAAFAAAAAAAAQEAAAAAAAABAy4AAAAAAAEBAAAAAAAAAAAYAAAAAAABAAAAAAAAAAEDLgAAAAAAAQAAAAAAAAAAABIAAAAAAAEBAAAAAAAAAQMjAAAAAAABAAAAAAAAAAEDIwAAAAAAAQEAAAAAAAABAS4AAAAAAAEBAAAAAAAAAAAVAAAAAAABAAAAAAAAAAEBLgAAAAAAAQAAAAAAAAAAABMAAAAAAAEBAAAAAAAAAQEiAAAAAAABAAAAAAAAAAEBIgAAAAAAAQEAAAAAAAABBC4AAAAAAAEBAAAAAAAAAAAWAAAAAAABAAAAAAAAAAEELgAAAAAAAQEAAAAAAAABBS4AAAAAAAEAAAAAAAAAAQUuAAAAAAABAAAAAAAAAAEDLQAAAAAAAQEAAAAAAAABAy0AAAAAAAEBAAAAAAAAAAAgAAAAAAABAQAAAAAAAAEFLAAAAAAAAQEAAAAAAAAAAD0AAAAAAAEAAAAAAAAAAQErAAAAAAABAAAAAAAAAAAAKgAAAAAAAQAAAAAAAAAAAB0AAAAAAAEBAAAAAAAAAQEnAAAAAAABAQAAAAAAAAAAFwAAAAAAAQEAAAAAAAABASgAAAAAAAEBAAAAAAAAAQEpAAAAAAABAQAAAAAAAAAACgAAAAAAAQEAAAAAAAAAADgAAAAAAAEBAAAAAAAAAQIbAAAAAAABAQAAAAAAAAEDHwAAAAAAAQEAAAAAAAACAAAAAAAAAAEBAAAAAAAAAAA2AAAAAAABAQAAAAAAAAAANQAAAAAAAQEAAAAAAAAAADMAAAAAAAEBAAAAAAAAAQEdAAAAAAABAQAAAAAAAAEBIQAAAAAAAQEAAAAAAAAAAAkAAAAAAAEBAAAAAAAAAQEbAAAAAAABAQAAAAAAAAAACwAAAAAAAQEAAAAAAAAAACsAAAAAAAEBAAAAAAAAAAAaAAAAAAABAQAAAAAAAAEDJAAAAAAAAQEAAAAAAAABAx4AAAAAAAEBAAAAAAAAAAAeAAAAAAABAQAAAAAAAAEDKgAAAAAAAQEAAAAAAAAAAC8AAAAAAAEBAAAAAAAAAAAOAAAAAAABAQAAAAAAAAAAKgAAAAAAAQEAAAAAAAABBCQAAAAAAAEBAAAAAAAAAQInAAAAAAABAQAAAAAAAAECJQAAAAAAAQEAAAAAAAAAAA8AAAAAAAEBAAAAAAAAAAAoAAAAAAABAQAAAAAAAAAAPwAAAAAAAQEAAAAAAAABBSYAAAAAAAEBAAAAAAAAAQMnAAAAAAABAQAAAAAAAAEGJgAAAAAAfQB7AG1lbW9yeQBjb25zdABhc3NpZ25tZW50AGNvbW1lbnQAc3RhdGVtZW50AGNvbnN0YW50AHN0YXRlbWVudHMAZGVjbGFyYXRpb25zAG9wZXJhdG9yAHJlZ2lzdGVyAHdyaXRlcgBtZW1vcnlfcmVhZGVyAG51bWJlcgBnb3RvAGNvbnN0YW50X2RlY2xhcmF0aW9uAGRhdGFfZGVjbGFyYXRpb24AbWVtb3J5X2V4cHJlc3Npb24Ac3lzY2FsbABsYWJlbABzdGF0ZW1lbnRfYmxvY2sAc3RyaW5nAHR5cGUAc2NvcGUAdmFyaWFibGVfbmFtZQBzb3VyY2VfZmlsZQB2YXJpYWJsZQBlbmQAZGF0YQBdAFsAPz0AOj0AOwA6AHN0YXRlbWVudHNfcmVwZWF0MQBkZWNsYXJhdGlvbnNfcmVwZWF0MQAsACEACgAAAAAAAAAAAAAAAAAAAAAAAAADAAAAEwAAABMAAAATAAAAEwAAABMAAAADAAAAAwAAAAEAAAABAAAAEgAAAAEAAAABAAAAEgAAABIAAAASAAAAEgAAABIAAAASAAAAEgAAABMAAAATAAAAAQAAABMAAAABAAAAAwAAABMAAAAAAAAAAAAAAAMAAAAAAAAAEwAAABMAAAADAAAAAwAAAAMAAAADAAAAEwAAAAAAAAAAAAAAAAAAAAsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABIAAAAAAAAAAAAAAAAAAAAAAAAACwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADQAAAC8AAAAAAAAAGwAAAAAAAABEAAAAAgAAAAEAAAAAAAAABgAAAJAIAAAAAAAAgAYAAFAJAABgEgAAAAAAAAAAAAAAAAAAkAcAACAIAAB+CAAAgAgAAMAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAbRAAAIAQAACwEAAAaw8AAHEQAABiDwAAYA8AAH0QAAB6EAAArhAAAN0PAACCEAAAfhAAAHgQAACsEAAAdhAAAD8QAACODwAAcRAAACIQAAC4DwAAGhAAAK8PAADWDwAAOBAAAEoQAAB8DwAAWBAAAKIPAAD8DwAA4g8AAPcPAACXDwAAhA8AACgQAABEEAAAcQ8AAN0PAABkEAAADxAAAM8PAADBDwAACBAAAMgPAABkDwAAlxAAAIQQAAA='));
class L3Visitor extends L2Visitor {
    expression(node) {
        // if the expression does not contain any sub-expressions it should be sent down to L0 instead of being handled here.
        if (!this.has_sub_expression(node)) {
            //node_stack.push(node);
            return super.expression(node);
        }
        // The algo:

        // Start scope
        // recursively handle the left child
        // If the right child is an expression, save result in a temporary variable
        // Else save in $x
        // recursively handle right side
        // If we are out of scopes it is the last expression and we save the result in $x
        // Else we return the full expression: left_expression & right_expression
        // end scope

        this._emitter.start_scope();

        var left_child = get_left_child(node);
        var right_child = get_right_child(node);

        //Handle left side
        var left_expression = this.visit(left_child);
        

        var is_nested_expression = right_child.type === 'expression';
        this._emitter.node_stack.push(left_child);
        left_expression = this._emitter.left_expression(left_expression, is_nested_expression);
        this._emitter.node_stack.pop();

        //Handle right side
        var right_expression = this.visit(right_child);
        if(this.is_binary_expression(right_child)){
        //    this._emitter.node_stack.push(right_child);
            this._emitter.node_stack.push(right_child);
            this._emitter.save_to_register_x(right_expression)
            this._emitter.node_stack.pop();
        }

        //Sum both sides
        //this._emitter.node_stack.push(node)
        var operator = get_operator(node).text;
        var full_expression = this._emitter.full_expression(left_expression, operator, right_expression);
        this._emitter.end_scope(false);

        var result = this._emitter.result(full_expression);
        return result;
    }

    has_sub_expression(expression) {
        for (var i = 0; i < expression.childCount; i++) {
            if (expression.child(i).type === 'expression') {
                return true;
            } 
        }
        return false;
    }

    is_binary_expression(node){
        return node.childCount >= 3;
    }

}

class L3Emitter extends L2Emitter{

    left_expression (left_expression, is_nested_expression ){
        if (is_nested_expression) {
            var bytesize = 'u8';
            this.create_temp_var(this.frame_pointer - get_variable_bytesize(bytesize), bytesize, left_expression);
            return this.read_temp_var(`${this.frame_pointer}`);
        }
        // Else we can just write it directly into $x
        else {
            this.save_to_register_x(left_expression);
            return this.register('$x');
        }
    }

    save_to_register_x(expression){
        this.assignment(this.register('$x'), expression);
    }

    full_expression(left_expression, operator, right_expression) {
        // If it is a binary assignment we have to save the right expression in a register before combining it with the left expression
        if (get_opcode(right_expression) === OP.ASSIGN_BIN) {
            return this.binary_expression(left_expression, operator, this.register('$x'));
        } else {
            return this.binary_expression(left_expression, operator, right_expression);
        }
    }

    result(full_expression){
        // If we are out of the scope we know we have handled the entire expression and we can save the final expression in $x and return $x to the caller (assignment)
        if (!this.in_scope) {
            this.save_to_register_x(full_expression);
            return this.expression(this.register('$x'));
        }else{
            return full_expression;
        }
    }
}

class L3Draw extends L2Draw {
    constructor(){
        super();
    }

    draw(vm) {
        super.draw(vm);
        return;
    }
}
encoded_levels.push(decode('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C0EzIQMMAQtBFCEDCyAAIAQgACgCCBEFAAwACwALC8suAQAjAAvELg8ABwABAAUACQABAAoACwABABMADQABABkADwABABoAEQABABsAEwABAB8AAwABADQAFAABACgAFQABACkAKgABADIAKwABAC8AQQABACcAFQACAAAABgBDAAMAKgArACwADwAZAAEABQAcAAEACgAfAAEAEwAiAAEAGQAlAAEAGgAoAAEAGwArAAEAHwADAAEANAAUAAEAKAAVAAEAKQAqAAEAMgArAAEALwBBAAEAJwAXAAIAAAAGAEMAAwAqACsALAAPAAcAAQAFAAkAAQAKAAsAAQATAA0AAQAZAA8AAQAaABEAAQAbABMAAQAfAAIAAQA0ABQAAQAoABUAAQApACoAAQAyACsAAQAvAEEAAQAnAEUAAQAmAEMAAwAqACsALAAPAAcAAQAFAAkAAQAKAAsAAQATAA0AAQAZAA8AAQAaABEAAQAbABMAAQAfAAIAAQA0ABQAAQAoABUAAQApACoAAQAyACsAAQAvAD4AAQAmAEEAAQAnAEMAAwAqACsALAAMAAcAAQAFAAkAAQAKAAsAAQATAA8AAQAaABEAAQAbABMAAQAfABMAAQAoABUAAQApACoAAQAyACsAAQAvADkAAQAnAEMAAwAqACsALAAIAAsAAQATAC4AAQAJADAAAQANADIAAQASACYAAQAuACcAAQAyAEQAAQAtADQABgAXABgAGQAaAB0AHwAHADYAAQADADkAAQAEAAgAAQAzAFMAAQAjAEkAAgAkACUAPgADAAoAGwAfADwABAAFABMAGQAaAAcAAwABAAMABQABAAQACAABADMAUwABACMASQACACQAJQBCAAMACgAbAB8AQAAEAAUAEwAZABoACAALAAEAEwAwAAEADQAyAAEAEgBEAAEACQAmAAEALgAnAAEAMgA6AAEALQA0AAYAFwAYABkAGgAdAB8ABwALAAEAEwAwAAEADQAyAAEAEgAmAAEALgAnAAEAMgBNAAEALQA0AAYAFwAYABkAGgAdAB8ABwALAAEAEwAwAAEADQAyAAEAEgAmAAEALgAnAAEAMgBKAAEALQA0AAYAFwAYABkAGgAdAB8ABwALAAEAEwAwAAEADQAyAAEAEgAmAAEALgAnAAEAMgBGAAEALQA0AAYAFwAYABkAGgAdAB8ABwALAAEAEwAwAAEADQAyAAEAEgAmAAEALgAnAAEAMgBUAAEALQA0AAYAFwAYABkAGgAdAB8ABwALAAEAEwAwAAEADQAyAAEAEgAmAAEALgAnAAEAMgA8AAEALQA0AAYAFwAYABkAGgAdAB8ABwALAAEAEwAwAAEADQAyAAEAEgAmAAEALgAnAAEAMgBOAAEALQA0AAYAFwAYABkAGgAdAB8ABwALAAEAEwAwAAEADQAyAAEAEgAmAAEALgAnAAEAMgA3AAEALQA0AAYAFwAYABkAGgAdAB8ABABGAAEAAABIAAEAAgBMAAEAIABKAAgABQAGAAoAEwAZABoAGwAfAAQAFwABAAAATgABAAIAUgABACAAUAAIAAUABgAKABMAGQAaABsAHwAEAFQAAQAAAFYAAQACAFoAAQAgAFgACAAFAAYACgATABkAGgAbAB8AAgBcAAIAAAACAF4ACQAFAAYACgATABkAGgAbAB8AIAACAGAAAgAAAAIAYgAJAAUABgAKABMAGQAaABsAHwAgAAUACwABABMAZAABAA0AJwABADIAMQABAC4ANAAGABcAGAAZABoAHQAfAAMARgABAAAASAABAAIASgAIAAUABgAKABMAGQAaABsAHwAFAAsAAQATAGYAAQANACcAAQAyAC4AAQAuADQABgAXABgAGQAaAB0AHwAFAAsAAQATAGgAAQANACcAAQAyAC8AAQAuADQABgAXABgAGQAaAB0AHwAFAAsAAQATAGoAAQANACcAAQAyADIAAQAuADQABgAXABgAGQAaAB0AHwADAGwAAQAAAG4AAQACAHAACAAFAAYACgATABkAGgAbAB8AAwAXAAEAAABOAAEAAgBQAAgABQAGAAoAEwAZABoAGwAfAAIAdAADAAoAGwAfAHIABgAAAAUABgATABkAGgACAHAAAwAKABsAHwBsAAYAAAAFAAYAEwAZABoABAALAAEAEwAnAAEAMgA0AAEALgA0AAYAFwAYABkAGgAdAB8AAgBQAAMACgAbAB8AFwAGAAAABQAGABMAGQAaAAIAeAAEAAUAEwAZABoAdgAFAAMABAAKABsAHwACAEoAAwAKABsAHwBGAAYAAAAFAAYAEwAZABoAAQB6AAgAAQAHAAgADgAPABAAEQASAAMANQABADEAPwABADAAfAAEABcAGAAaAB0AAwB+AAIAAQAOAIAAAgAPABAAggACABEAEgABAIQABgABAA4ADwAQABEAEgACADgAAQAxAHwABAAXABgAGgAdAAIAhgACAA8AEACIAAIAEQASAAEAigACAAcACAABAIwAAgAHAAgAAQCOAAIAAQAOAAEAjgACAAEADgABAJAAAgABAA4AAQCQAAIAAQAOAAEAkgACABkAGgABAJQAAgABAA4AAQCUAAIAAQAOAAIAlgABABQAmAABABwAAQCaAAIAAQAOAAIAnAABABQAngABABwAAQCgAAEAAAABAKIAAQAOAAEApAABABQAAQCmAAEAAQABAKgAAQABAAEAqgABAAAAAQCsAAEAAQABAK4AAQAWAAEAsAABAAAAAQCcAAEAFAABALIAAQALAAEAtAABAAEAAQC2AAEAAQABALgAAQABAAEAugABAAEAAQC8AAEABgABAL4AAQAOAAEAwAABABUAAQDCAAEAFwABAMQAAQABAAEAxgABAAEAAQDIAAEAHQABAMoAAQACAAEAzAABAA4AAQDOAAEADgABANAAAQAMAAEA0gABAB4AAQDUAAEAGAABANYAAQAWAAEA2AABAAEAAQDaAAEADgABANwAAQABAAEA3gABAAEAAAAAAAAAAAAAAAAAAAAAADEAAABiAAAAkgAAAMIAAADpAAAABwEAACMBAAA/AQAAXQEAAHgBAACTAQAArgEAAMkBAADkAQAA/wEAABoCAAAuAgAAQgIAAFYCAABmAgAAdgIAAIsCAACcAgAAsQIAAMYCAADbAgAA7AIAAP0CAAALAwAAGQMAACsDAAA5AwAARwMAAFUDAABgAwAAbQMAAHoDAACDAwAAjQMAAJYDAACbAwAAoAMAAKUDAACqAwAArwMAALQDAAC5AwAAvgMAAMMDAADKAwAAzwMAANYDAADaAwAA3gMAAOIDAADmAwAA6gMAAO4DAADyAwAA9gMAAPoDAAD+AwAAAgQAAAYEAAAKBAAADgQAABIEAAAWBAAAGgQAAB4EAAAiBAAAJgQAACoEAAAuBAAAMgQAADYEAAA6BAAAPgQAAEIEAABGBAAASgQAAE4EAABSBAAAVgQAAAAAAAAAAAAAAAAAAAABAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAAAAAAAAAAAAAEAAgADAAQABQAGAAcACAAJAAoACwAMAA0ADgAPABAAEQASABMAFAAVABYAFwAYABkAGgAbABwAHQAeAB8AIAAhACIAIwAkACUAJgAnACgAKQAqACsALAAtAC4ALwAwADEAMgAzADQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAEwAAABMAAAATAAAAEwAAABMAAAABAAAAAwAAAAMAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAABIAAAASAAAAEgAAABIAAAASAAAAAQAAABIAAAABAAAAAQAAAAEAAAASAAAAEgAAABMAAAATAAAAAQAAABMAAAADAAAAEwAAAAMAAAAAAAAAAwAAAAMAAAAAAAAAAwAAAAMAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABMAAAAAAAAAEwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALAAAAAAAAAAAAAAATAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEAAAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAFAAcAAAAAAAAAAAAJAAAAAAAAAAAAAAAAAAAAAAALAAAAAAAAAAAAAAANAA8AEQAAAAAAAAATAAAAOwAFAFMASQBJADYAQQAUABUAQwBDAEMAAAAAACsAAAAAACoACQACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAADAAAAAAAAAAEAAAAAAAAAAABIAAAAAAABAAAAAAAAAAAAUQAAAAAAAQEAAAAAAAAAAAQAAAAAAAEAAAAAAAAAAAAwAAAAAAABAQAAAAAAAAAAJQAAAAAAAQEAAAAAAAAAAAYAAAAAAAEBAAAAAAAAAAAqAAAAAAABAAAAAAAAAAAAQwAAAAAAAQAAAAAAAAAAAEAAAAAAAAEBAAAAAAAAAQEmAAAAAAABAQAAAAAAAAECNAAAAAAAAgEAAAAAAAABAjQAAAAAAAAABAAAAQAAAgAAAAAAAAABAjQAAAAAAAAAMAAAAQAAAgEAAAAAAAABAjQAAAAAAAAAJQAAAQAAAgEAAAAAAAABAjQAAAAAAAAABgAAAQAAAgEAAAAAAAABAjQAAAAAAAAAKgAAAQAAAgAAAAAAAAABAjQAAAAAAAAAQwAAAQAAAgAAAAAAAAABAjQAAAAAAAAAQAAAAQAAAQEAAAAAAAAAAAwAAAAAAAEBAAAAAAAAAAANAAAAAAABAQAAAAAAAAAAIAAAAAAAAQEAAAAAAAAAACcAAAAAAAIAAAAAAAAAAQIzAAAAAAAAAEgAAAEAAAIAAAAAAAAAAQIzAAAAAAAAAFEAAAEAAAEBAAAAAAAAAQIzAAAAAAABAAAAAAAAAAECMwAAAAAAAQEAAAAAAAABASIAAAAAAAEAAAAAAAAAAQEiAAAAAAABAQAAAAAAAAAADwAAAAAAAQEAAAAAAAABAzQAAAAAAAEBAAAAAAAAAAAfAAAAAAABAAAAAAAAAAEDNAAAAAAAAQAAAAAAAAAAABwAAAAAAAEBAAAAAAAAAAAjAAAAAAABAAAAAAAAAAECNAAAAAAAAQAAAAAAAAAAABgAAAAAAAEBAAAAAAAAAQE0AAAAAAABAQAAAAAAAAAAIQAAAAAAAQAAAAAAAAABATQAAAAAAAEAAAAAAAAAAAAdAAAAAAABAQAAAAAAAAEBKAAAAAAAAQAAAAAAAAABASgAAAAAAAEBAAAAAAAAAQMpAAAAAAABAAAAAAAAAAEDKQAAAAAAAQEAAAAAAAAAABAAAAAAAAEBAAAAAAAAAAAOAAAAAAABAQAAAAAAAAAAEQAAAAAAAQEAAAAAAAAAAAsAAAAAAAEBAAAAAAAAAQQ0AAAAAAABAQAAAAAAAAAAHgAAAAAAAQAAAAAAAAABBDQAAAAAAAEBAAAAAAAAAQU0AAAAAAABAAAAAAAAAAEFNAAAAAAAAQAAAAAAAAABAzMAAAAAAAEBAAAAAAAAAQMzAAAAAAABAQAAAAAAAAEFMgAAAAAAAQEAAAAAAAAAADMAAAAAAAEBAAAAAAAAAQEtAAAAAAABAQAAAAAAAAAAGwAAAAAAAQEAAAAAAAAAABcAAAAAAAEBAAAAAAAAAQEuAAAAAAABAQAAAAAAAAAAGgAAAAAAAQEAAAAAAAAAABkAAAAAAAEBAAAAAAAAAQEvAAAAAAABAQAAAAAAAAAACgAAAAAAAQEAAAAAAAABBy0AAAAAAAEBAAAAAAAAAQUtAAAAAAABAQAAAAAAAAAAQgAAAAAAAQEAAAAAAAABAy0AAAAAAAEBAAAAAAAAAQExAAAAAAABAAAAAAAAAAEBMQAAAAAAAQEAAAAAAAABAi0AAAAAAAEBAAAAAAAAAABSAAAAAAABAAAAAAAAAAAAKAAAAAAAAQEAAAAAAAABASEAAAAAAAEBAAAAAAAAAAAtAAAAAAABAQAAAAAAAAEDMAAAAAAAAQEAAAAAAAAAABIAAAAAAAEBAAAAAAAAAQMqAAAAAAABAQAAAAAAAAIAAAAAAAAAAQEAAAAAAAABBCoAAAAAAAEBAAAAAAAAAABPAAAAAAABAQAAAAAAAAECIQAAAAAAAQEAAAAAAAAAAD0AAAAAAAEBAAAAAAAAAAATAAAAAAABAQAAAAAAAAECKwAAAAAAAQEAAAAAAAABAScAAAAAAAEBAAAAAAAAAQUsAAAAAAABAQAAAAAAAAAAFgAAAAAAAQEAAAAAAAAAACkAAAAAAAEBAAAAAAAAAAAkAAAAAAABAQAAAAAAAAAASwAAAAAAAQEAAAAAAAABASMAAAAAAAEBAAAAAAAAAQYsAAAAAAABAQAAAAAAAAAAVgAAAAAAAQEAAAAAAAAAACIAAAAAAAEBAAAAAAAAAAAvAAAAAAABAQAAAAAAAAAALgAAAAAAAQEAAAAAAAAAAAcAAAAAAAEBAAAAAAAAAABVAAAAAAABAQAAAAAAAAAAUAAAAAAAAQEAAAAAAAAAAEcAAAAAAAEBAAAAAAAAAABMAAAAAAABAQAAAAAAAAAALAAAAAAAAQEAAAAAAAABAyUAAAAAAAEBAAAAAAAAAQMkAAAAAAB9AHsAbWVtb3J5AGNvbnN0AGFzc2lnbm1lbnQAY29tbWVudABzdGF0ZW1lbnQAY29uc3RhbnQAc3RhdGVtZW50cwBkZWNsYXJhdGlvbnMAb3BlcmF0b3IAcmVnaXN0ZXIAd3JpdGVyAG1lbW9yeV9yZWFkZXIAbnVtYmVyAGdvdG8AY29uc3RhbnRfZGVjbGFyYXRpb24AZGF0YV9kZWNsYXJhdGlvbgBtZW1vcnlfZXhwcmVzc2lvbgBzeXNjYWxsAGxhYmVsAHN0YXRlbWVudF9ibG9jawBzdHJpbmcAdHlwZQBzY29wZQB2YXJpYWJsZV9uYW1lAHNvdXJjZV9maWxlAHZhcmlhYmxlAGVuZABkYXRhAF0AWwA/PQA6PQA7ADoAc3RhdGVtZW50c19yZXBlYXQxAGRlY2xhcmF0aW9uc19yZXBlYXQxAC8ALQAsACsAKgApACgAIQAKAAAADQAAADUAAAAAAAAAIQAAAAAAAABXAAAAAgAAAAEAAAAAAAAABwAAAKAMAAAAAAAAwAgAAIANAABwFgAAAAAAAAAAAAAAAAAAIAoAAMAKAAAqCwAALAsAAEALAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAjRUAAKAVAADcFQAAixQAAJEVAACCFAAAgBQAAJ0VAACaFQAA2hUAAP0UAACiFQAAnhUAANgVAADWFQAA1BUAAMwVAADSFQAAzhUAAJgVAADQFQAAlhUAAF8VAACuFAAAkRUAAEIVAADYFAAAOhUAAM8UAAD2FAAAWBUAAGoVAACcFAAAeBUAAMIUAAAcFQAAAhUAABcVAAC3FAAApBQAAEgVAABkFQAAkRQAAP0UAACEFQAALxUAAO8UAADhFAAAKBUAAOgUAACEFAAAtxUAAKQVAAA='));
class L4Visitor extends L3Visitor {
    if(node) {
        this._emitter.number_of_if++;
        this._emitter.current_if.push(this._emitter.number_of_if);
        var guard_expression = this.visit(node.child(2));
        var has_else = this.has_else(node);
        this._emitter.start_if(guard_expression, has_else);
        this.visit(node.child(4));
        this._emitter.end_if(has_else)
        if (has_else) {
            this.visit(node.child(5))
        }
        this._emitter.current_if.pop();
    }

    else(node) {
        this._emitter.start_else();
        this.visit(node.child(1));
        this._emitter.end_else();
    }

    has_else(node) {
        var has_else = false;
        node.children.forEach(c => {
            if (c.type === "else") {
                has_else = true;
            }
        })
        return has_else;
    }
}

class L4Emitter extends L3Emitter{
    start_if(guard_expression, has_else) {
        this.assignment(this.register('$?'), guard_expression, false, true);
        if (has_else) {
            this.goto(this.get_label(`#ELSE_${this.current_if.peek()}`))
        } else {
            this.goto(this.get_label(`#END_${this.current_if.peek()}`))
        }
    }

    end_if(has_else) {
        if (has_else) {
            this.assignment(this.register('$?'), this.number(1), false, false);
            this.goto(this.get_label(`#END_${this.current_if.peek()}`))
        } else {
            this.set_label(`#END_${this.current_if.peek()}`)
        }
    }

    start_else() {
        this.set_label(`#ELSE_${this.current_if.peek()}`)
    }

    end_else() {
        this.set_label(`#END_${this.current_if.peek()}`)
    }

    number_of_if = 0;

    current_if = {
        items: [],
    
        push(element)
        {
            this.items.push(element);
        },
    
        pop()
        {
            if (this.items.length == 0)
                return "Underflow";
            return this.items.pop();
        },

        peek(){
            return this.items[this.items.length-1];
        }
    }
}

class L4Draw extends L3Draw {
    constructor(){
        super();
    }

    draw(vm) {
        super.draw(vm);
        return;
    }
}
encoded_levels.push(decode('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CBEFAAwACwALC+s0AQAjAAvkNBAABwABAAUACQABAAkACwABAA4ADQABABUADwABABsAEQABABwAEwABAB0AFQABACEAAwABADgAEgABACoANgABADYAOwABADMASQABACkAFwACAAAACgATAAIAKwAtAFIAAwAuAC8AMAAQABsAAQAFAB4AAQAJACEAAQAOACQAAQAVACcAAQAbACoAAQAcAC0AAQAdADAAAQAhAAMAAQA4ABIAAQAqADYAAQA2ADsAAQAzAEkAAQApABkAAgAAAAoAEwACACsALQBSAAMALgAvADAAEAAHAAEABQAJAAEACQALAAEADgANAAEAFQAPAAEAGwARAAEAHAATAAEAHQAVAAEAIQACAAEAOAASAAEAKgA2AAEANgA7AAEAMwBJAAEAKQBgAAEAKAATAAIAKwAtAFIAAwAuAC8AMAAQAAcAAQAFAAkAAQAJAAsAAQAOAA0AAQAVAA8AAQAbABEAAQAcABMAAQAdABUAAQAhAAIAAQA4ABIAAQAqADYAAQA2ADsAAQAzAEMAAQAoAEkAAQApABMAAgArAC0AUgADAC4ALwAwABAABwABAAUACQABAAkACwABAA4ADQABABUADwABABsAEQABABwAEwABAB0AFQABACEAAgABADgAEgABACoANgABADYAOwABADMASQABACkAWAABACgAEwACACsALQBSAAMALgAvADAADQAHAAEABQAJAAEACQALAAEADgANAAEAFQARAAEAHAATAAEAHQAVAAEAIQAbAAEAKgA2AAEANgA7AAEAMwBRAAEAKQATAAIAKwAtAFIAAwAuAC8AMAAHADMAAQADADYAAQAEAAgAAQA3AE0AAQAlAEwAAgAmACcAOQAEAAUADgAdACEAOwAEAAkAFQAbABwABwADAAEAAwAFAAEABAAIAAEANwBNAAEAJQBMAAIAJgAnAD0ABAAFAA4AHQAhAD8ABAAJABUAGwAcAAQARQABAAgAFgABACwAQQACAAAAAgBDAAoABQAJAAoADgAVABsAHAAdACEAIgACAEcAAgAAAAIASQALAAUACAAJAAoADgAVABsAHAAdACEAIgAIAA0AAQAVAEsAAQAGAE0AAQANAE8AAQAUACsAAQAyACwAAQA2AE4AAQAxAFEABgAZABoAGwAcAB8AIQAIAA0AAQAVAEsAAQAGAE8AAQAUAFMAAQANACsAAQAyACwAAQA2AD4AAQAxAFEABgAZABoAGwAcAB8AIQAHAA0AAQAVAEsAAQAGAE8AAQAUACsAAQAyACwAAQA2AFQAAQAxAFEABgAZABoAGwAcAB8AIQACAFUAAgAAAAIAVwAKAAUACQAKAA4AFQAbABwAHQAhACIABwANAAEAFQBLAAEABgBPAAEAFAArAAEAMgAsAAEANgBVAAEAMQBRAAYAGQAaABsAHAAfACEABwANAAEAFQBLAAEABgBPAAEAFAArAAEAMgAsAAEANgBTAAEAMQBRAAYAGQAaABsAHAAfACEABABZAAEAAABbAAEAAgBfAAEAIgBdAAkABQAJAAoADgAVABsAHAAdACEAAgBhAAIAAAACAGMACgAFAAkACgAOABUAGwAcAB0AIQAiAAIARwACAAAAAgBJAAoABQAJAAoADgAVABsAHAAdACEAIgAHAA0AAQAVAEsAAQAGAE8AAQAUACsAAQAyACwAAQA2AEgAAQAxAFEABgAZABoAGwAcAB8AIQACAGUAAgAAAAIAZwAKAAUACQAKAA4AFQAbABwAHQAhACIABwANAAEAFQBLAAEABgBPAAEAFAArAAEAMgAsAAEANgBbAAEAMQBRAAYAGQAaABsAHAAfACEABwANAAEAFQBLAAEABgBPAAEAFAArAAEAMgAsAAEANgBdAAEAMQBRAAYAGQAaABsAHAAfACEABwANAAEAFQBLAAEABgBPAAEAFAArAAEAMgAsAAEANgBcAAEAMQBRAAYAGQAaABsAHAAfACEABwANAAEAFQBLAAEABgBPAAEAFAArAAEAMgAsAAEANgBFAAEAMQBRAAYAGQAaABsAHAAfACEABAAZAAEAAABpAAEAAgBtAAEAIgBrAAkABQAJAAoADgAVABsAHAAdACEABABvAAEAAABxAAEAAgB1AAEAIgBzAAkABQAJAAoADgAVABsAHAAdACEAAwB3AAEAAAB5AAEAAgB7AAkABQAJAAoADgAVABsAHAAdACEAAwBvAAEAAABxAAEAAgBzAAkABQAJAAoADgAVABsAHAAdACEAAwAZAAEAAABpAAEAAgBrAAkABQAJAAoADgAVABsAHAAdACEABQANAAEAFQB9AAEABgAsAAEANgA0AAEAMgBRAAYAGQAaABsAHAAfACEAAgBzAAQABQAOAB0AIQBvAAYAAAAJAAoAFQAbABwAAgCBAAQACQAVABsAHAB/AAYAAwAEAAUADgAdACEAAgBrAAQABQAOAB0AIQAZAAYAAAAJAAoAFQAbABwABQANAAEAFQCDAAEABgAsAAEANgA6AAEAMgBRAAYAGQAaABsAHAAfACEABQANAAEAFQCFAAEABgAsAAEANgA4AAEAMgBRAAYAGQAaABsAHAAfACEABQANAAEAFQCHAAEABgAsAAEANgA1AAEAMgBRAAYAGQAaABsAHAAfACEAAgB7AAQABQAOAB0AIQB3AAYAAAAJAAoAFQAbABwAAgCLAAQABQAOAB0AIQCJAAYAAAAJAAoAFQAbABwABAANAAEAFQAsAAEANgA8AAEAMgBRAAYAGQAaABsAHAAfACEAAQCNAAgAAQAHAAsADAARABIAEwAUAAMAjwACAAEABwCRAAIAEQASAJMAAgATABQAAQCVAAYAAQAHABEAEgATABQAAwA5AAEANQBPAAEANACXAAQAGQAaABwAHwACAEEAAQA1AJcABAAZABoAHAAfAAIAmQACABEAEgCbAAIAEwAUAAIAnQABABYAnwABAB4AAQChAAIAAQAHAAEAoQACAAEABwABAKMAAgAbABwAAQClAAIAAQAHAAEApQACAAEABwABAKcAAgALAAwAAgAJAAEACQAPAAEALQABAKkAAgABAAcAAgCrAAEAFgCtAAEAHgABAKkAAgABAAcAAQCvAAIACwAMAAEAsQACAAEABwACALMAAQAJAAoAAQAtAAEAtQABAAEAAQC3AAEAAAABALkAAQAXAAEAuwABABYAAQC9AAEAAQABAL8AAQAKAAEAwQABACAAAQDDAAEAAQABAMUAAQAfAAEAxwABAAEAAQDJAAEABwABAMsAAQABAAEAzQABAAIAAQDPAAEAAAABANEAAQABAAEA0wABAAEAAQDVAAEAAQABAKsAAQAWAAEA1wABAA8AAQDZAAEAAQABANsAAQABAAEA3QABAAcAAQDfAAEABwABAOEAAQABAAEA4wABABAAAQDlAAEAGAABAOcAAQAAAAEA6QABABkAAQDrAAEAGAABAO0AAQAHAAEA7wABAAcAAQDxAAEABwABAPMAAQABAAEA9QABAAYAAQD3AAEACgABAPkAAQAaAAAAAAAAAAAAAAAAAAAAAAAAADUAAABqAAAAngAAANIAAAAGAQAAMQEAAE4BAABrAQAAggEAAJQBAACyAQAA0AEAAOsBAAD8AQAAFwIAADICAABHAgAAWAIAAGkCAACEAgAAlQIAALACAADLAgAA5gIAAAEDAAAWAwAAKwMAAD0DAABPAwAAYQMAAHYDAACFAwAAlAMAAKMDAAC4AwAAzQMAAOIDAADxAwAAAAQAABIEAAAdBAAAKgQAADMEAABABAAASgQAAFMEAABaBAAAXwQAAGQEAABpBAAAbgQAAHMEAAB4BAAAfwQAAIQEAACLBAAAkAQAAJUEAACaBAAAoQQAAKUEAACpBAAArQQAALEEAAC1BAAAuQQAAL0EAADBBAAAxQQAAMkEAADNBAAA0QQAANUEAADZBAAA3QQAAOEEAADlBAAA6QQAAO0EAADxBAAA9QQAAPkEAAD9BAAAAQUAAAUFAAAJBQAADQUAABEFAAAVBQAAGQUAAB0FAAAhBQAAJQUAACkFAAAtBQAAAAEAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAAAAAAAAAAAAAAAAAAEAAgADAAQABQAGAAcACAAJAAoACwAMAA0ADgAPABAAEQASABMAFAAVABYAFwAYABkAGgAbABwAHQAeAB8AIAAhACIAIwAkACUAJgAnACgAKQAqACsALAAtAC4ALwAwADEAMgAzADQANQA2ADcAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAABQAAAAUAAAAFAAAABQAAAAUAAAAFAAAAAMAAAADAAAAEgAAABIAAAABAAAAAQAAAAEAAAATAAAAAQAAAAEAAAATAAAAEwAAABMAAAABAAAAEwAAAAEAAAABAAAAAQAAAAEAAAATAAAAEwAAABMAAAATAAAAEwAAAAEAAAAUAAAAAwAAABQAAAABAAAAAQAAAAEAAAAUAAAAFAAAAAEAAAADAAAAAwAAAAMAAAAAAAAAAAAAAAMAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAUAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALAAAAAAAAAAAAAAALAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQABAAAAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAFAAcAAAAAAAAACQAAAAAAAAAAAAsAAAAAAAAAAAAAAAAADQAAAAAAAAAAAAAADwARABMAAAAAAAAAFQAAAD8ABgBNAEwATABLAEkAEgATAAAAEwBSAFIAUgAAAAAAOwAAAAAANgAJAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAMAAAAAAAAAAQAAAAAAAAAAAFkAAAAAAAEAAAAAAAAAAABhAAAAAAABAAAAAAAAAAAAXwAAAAAAAQEAAAAAAAAAAAUAAAAAAAEAAAAAAAAAAAAzAAAAAAABAQAAAAAAAAAALQAAAAAAAQEAAAAAAAAAAAcAAAAAAAEBAAAAAAAAAAA2AAAAAAABAAAAAAAAAAAAUgAAAAAAAQAAAAAAAAAAAFAAAAAAAAEBAAAAAAAAAQEoAAAAAAABAQAAAAAAAAECOAAAAAAAAgAAAAAAAAABAjgAAAAAAAAAXwAAAQAAAgEAAAAAAAABAjgAAAAAAAAABQAAAQAAAgAAAAAAAAABAjgAAAAAAAAAMwAAAQAAAgEAAAAAAAABAjgAAAAAAAAALQAAAQAAAgEAAAAAAAABAjgAAAAAAAAABwAAAQAAAgEAAAAAAAABAjgAAAAAAAAANgAAAQAAAgAAAAAAAAABAjgAAAAAAAAAUgAAAQAAAgAAAAAAAAABAjgAAAAAAAAAUAAAAQAAAgAAAAAAAAABAjcAAAAAAAAAWQAAAQAAAgAAAAAAAAABAjcAAAAAAAAAYQAAAQAAAQAAAAAAAAABAjcAAAAAAAEBAAAAAAAAAQI3AAAAAAABAAAAAAAAAAEBJAAAAAAAAQEAAAAAAAABASQAAAAAAAEBAAAAAAAAAQUrAAAAAAABAAAAAAAAAAEFKwAAAAAAAQAAAAAAAAAAADcAAAAAAAEBAAAAAAAAAQMtAAAAAAABAAAAAAAAAAEDLQAAAAAAAQEAAAAAAAAAABUAAAAAAAEBAAAAAAAAAAAQAAAAAAABAQAAAAAAAAAAKQAAAAAAAQEAAAAAAAAAACwAAAAAAAEBAAAAAAAAAAAaAAAAAAABAQAAAAAAAAECLAAAAAAAAQAAAAAAAAABAiwAAAAAAAEBAAAAAAAAAQE4AAAAAAABAQAAAAAAAAAAIwAAAAAAAQAAAAAAAAABATgAAAAAAAEAAAAAAAAAAAAfAAAAAAABAQAAAAAAAAEBKgAAAAAAAQAAAAAAAAABASoAAAAAAAEBAAAAAAAAAQYrAAAAAAABAAAAAAAAAAEGKwAAAAAAAQEAAAAAAAAAACEAAAAAAAEAAAAAAAAAAQI4AAAAAAABAAAAAAAAAAAAHgAAAAAAAQEAAAAAAAABAzgAAAAAAAEBAAAAAAAAAAAnAAAAAAABAAAAAAAAAAEDOAAAAAAAAQAAAAAAAAAAAB0AAAAAAAEBAAAAAAAAAQQ4AAAAAAABAQAAAAAAAAAAKAAAAAAAAQAAAAAAAAABBDgAAAAAAAEBAAAAAAAAAAAZAAAAAAABAAAAAAAAAAEDNwAAAAAAAQEAAAAAAAABAzcAAAAAAAEBAAAAAAAAAAARAAAAAAABAQAAAAAAAAAADgAAAAAAAQEAAAAAAAAAABcAAAAAAAEBAAAAAAAAAQU4AAAAAAABAAAAAAAAAAEFOAAAAAAAAQEAAAAAAAABBTYAAAAAAAEBAAAAAAAAAQExAAAAAAABAQAAAAAAAAAAJAAAAAAAAQEAAAAAAAAAACUAAAAAAAEBAAAAAAAAAQEyAAAAAAABAQAAAAAAAAAAMAAAAAAAAQEAAAAAAAAAACYAAAAAAAEBAAAAAAAAAAAgAAAAAAABAQAAAAAAAAEBNQAAAAAAAQAAAAAAAAABATUAAAAAAAEBAAAAAAAAAQcxAAAAAAABAQAAAAAAAAAAQgAAAAAAAQEAAAAAAAABBTEAAAAAAAEBAAAAAAAAAQEzAAAAAAABAQAAAAAAAAEDMQAAAAAAAQEAAAAAAAAAAFoAAAAAAAEAAAAAAAAAAAAuAAAAAAABAQAAAAAAAAAADQAAAAAAAQEAAAAAAAABAjEAAAAAAAEBAAAAAAAAAAAEAAAAAAABAQAAAAAAAAEDLgAAAAAAAQEAAAAAAAACAAAAAAAAAAEBAAAAAAAAAAAqAAAAAAABAQAAAAAAAAEDNAAAAAAAAQEAAAAAAAABAi8AAAAAAAEBAAAAAAAAAAAUAAAAAAABAQAAAAAAAAAAXgAAAAAAAQEAAAAAAAABBC4AAAAAAAEBAAAAAAAAAABHAAAAAAABAQAAAAAAAAEDJgAAAAAAAQEAAAAAAAAAAC8AAAAAAAEBAAAAAAAAAAAbAAAAAAABAQAAAAAAAAAAIgAAAAAAAQEAAAAAAAABASMAAAAAAAEBAAAAAAAAAQElAAAAAAABAQAAAAAAAAAASgAAAAAAAQEAAAAAAAABBTAAAAAAAAEBAAAAAAAAAABXAAAAAAABAQAAAAAAAAAAHAAAAAAAAQEAAAAAAAABASkAAAAAAAEBAAAAAAAAAAA1AAAAAAABAQAAAAAAAAAANAAAAAAAAQEAAAAAAAABBjAAAAAAAAEBAAAAAAAAAAAMAAAAAAABAQAAAAAAAAAAVgAAAAAAAQEAAAAAAAABAiMAAAAAAAEBAAAAAAAAAABGAAAAAAABAQAAAAAAAAAAQAAAAAAAAQEAAAAAAAAAADIAAAAAAAEBAAAAAAAAAAAxAAAAAAABAQAAAAAAAAAAPQAAAAAAAQEAAAAAAAABAycAAAAAAAEBAAAAAAAAAAAYAAAAAAABAQAAAAAAAAAACwAAAAAAAQEAAAAAAAAAAEQAAAAAAH0AewBtZW1vcnkAY29uc3QAYXNzaWdubWVudABjb21tZW50AHN0YXRlbWVudABjb25zdGFudABzdGF0ZW1lbnRzAGRlY2xhcmF0aW9ucwBvcGVyYXRvcgByZWdpc3RlcgB3cml0ZXIAbWVtb3J5X3JlYWRlcgBudW1iZXIAZ290bwBjb25zdGFudF9kZWNsYXJhdGlvbgBkYXRhX2RlY2xhcmF0aW9uAG1lbW9yeV9leHByZXNzaW9uAHN5c2NhbGwAbGFiZWwAc3RhdGVtZW50X2Jsb2NrAHN0cmluZwBpZgBlbHNlAHR5cGUAc2NvcGUAdmFyaWFibGVfbmFtZQBzb3VyY2VfZmlsZQB2YXJpYWJsZQBlbmQAZGF0YQBdAFsAPz0AOj0AOwA6AHN0YXRlbWVudHNfcmVwZWF0MQBkZWNsYXJhdGlvbnNfcmVwZWF0MQAvAC0ALAArACoAKQAoACEACgAAAA0AAAA5AAAAAAAAACMAAAAAAAAAYgAAAAIAAAABAAAAAAAAAAcAAADADgAAAAAAAHAKAACwDwAAgBkAAAAAAAAAAAAAAAAAAPALAACgDAAAEg0AABQNAAAwDQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJ0YAACwGAAA7BgAAJMXAAChGAAAZxgAAOgYAADmGAAAahgAAIoXAACIFwAArRgAAKoYAADqGAAABRgAALIYAACuGAAA5BgAANwYAADiGAAA3hgAAKgYAADgGAAAphgAAG8YAAC2FwAAoRgAAEoYAADgFwAAQhgAANcXAAD+FwAAYBgAAHoYAACkFwAAiBgAAMoXAAAkGAAAChgAAB8YAAC/FwAArBcAAFAYAABnGAAAahgAAHQYAACZFwAABRgAAJQYAAA3GAAA9xcAAOkXAAAwGAAA8BcAAIwXAADHGAAAtBgAAA=='));
for (var i = 0; i < encoded_levels.length; i++){
    var opt = document.createElement('option');
    opt.value = i;
    opt.innerHTML = "L"+i;
    document.getElementById('levels').appendChild(opt);
}
document.getElementById('levels').value = 3;

function get_visitor(level) {
  switch (level) {
        case 0:
            return new L0Visitor();
        case 1:
            return new L1Visitor();
        case 2:
            return new L2Visitor();
        case 3:
            return new L3Visitor();
        case 4:
            return new L4Visitor();
}
}
function get_drawer(level) {
  switch (level) {
        case 0:
            return new L0Draw();
        case 1:
            return new L1Draw();
        case 2:
            return new L2Draw();
        case 3:
            return new L3Draw();
        case 4:
            return new L4Draw();
}
}
function get_emitter(level) {
  switch (level) {
        case 0:
            return new L0Emitter();
        case 1:
            return new L1Emitter();
        case 2:
            return new L2Emitter();
        case 3:
            return new L3Emitter();
        case 4:
            return new L4Emitter();
}
}