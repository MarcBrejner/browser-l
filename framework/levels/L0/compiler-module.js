class L0Visitor {
    visit(node) {
        //if (node.type === "statement") this._emitter.node_stack.push(node);
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

    register(register_id) {;
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
          var res = `<span id=line-number>${i} </span>` + instructions[i].handle(this) + this.print_label(i) +`<br>`;
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
        pretty_window.innerHTML = pretty_source_code;
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
    
      print_label(i){
        var [exists, label_key] = getKeyByValueIfValueExists(this.program.labels, i);
        var result = exists ? `${this.wrap_label(label_key)}` : "";
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