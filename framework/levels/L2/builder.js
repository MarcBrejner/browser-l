class L2Builder extends L1Builder {
    handle(node) {
        if (node.type === "scope") { 
            var frame = new StackFrame();
            frame.next = this.head;
            this.head = frame;
            this.in_scope = true;
            Stack.push(this.variable_pointer);
            for (var i = 0; i < node.childCount; i++){
                this.handle(node.child(i));
            }
            var offset = Stack.pop() - this.variable_pointer;
            this.variable_pointer += offset;
            //TODO: SÆT this.head til frame.next for at vise variable efter man er gået ud af et scope
            this.push_statement(node.child(node.childCount-1), new ByteCode(OP.ASSIGN_BIN, [false, new Content(CONTENT_TYPES.REGISTER, '$vp'), new Content(CONTENT_TYPES.REGISTER, '$vp'), '+', new Content(CONTENT_TYPES.NUMBER, offset)]));
            if (this.variable_pointer === 112) {
                this.in_scope = false;
            }
        } 
        else if (node.type === "variable" && this.in_scope) {
            var variable_size = get_variable_bytesize(node.child(2).text);
            this.variable_pointer -= variable_size;
            this.head.variables[node.child(0).text] = [this.stack_pointer - this.variable_pointer, node.child(2).text];
            var expression = super.handle(node.child(4));
            const snapshot = structuredClone(this.head.variables);
            
            this.push_statement(node, new ByteCode(OP.ASSIGN_BIN, [false, new Content(CONTENT_TYPES.REGISTER, '$vp'), new Content(CONTENT_TYPES.REGISTER, '$sp'), '-', new Content(CONTENT_TYPES.NUMBER, this.stack_pointer - this.variable_pointer)]),L2Draw, [snapshot]);
            this.push_statement(node, new ByteCode(OP.ASSIGN, [false, new Content(CONTENT_TYPES.MEMORY, new Content(CONTENT_TYPES.REGISTER, '$vp'), get_datatype(node.child(2).text))].concat(expression)), L2Draw, [snapshot])            
        }
        else if (node.type === "variable_name" && this.in_scope) {
            var current = this.head;
            while (current != null) {
                if (node.text in current.variables) {
                    this.push_statement(node, new ByteCode(OP.ASSIGN_BIN, [false, new Content(CONTENT_TYPES.REGISTER, '$vp'), new Content(CONTENT_TYPES.REGISTER, '$sp'), '-', new Content(CONTENT_TYPES.NUMBER,  current.variables[node.text][0])]));
                    return new Content(CONTENT_TYPES.MEMORY, new Content(CONTENT_TYPES.REGISTER, '$vp'),  get_datatype(current.variables[node.text][1]));
                }   
                current = current.next;
            }
        }
        else if (node.type === "variable") { 
            this.variable_declaration(node);
        } else if (node.type === "variable_name") {
            return new Content(CONTENT_TYPES.MEMORY, new Content(CONTENT_TYPES.DATA, '&_' + node.text), get_datatype(this.variables["&_" + node.text]));
        } else {
            return super.handle(node);
        }
    }

    variable_declaration(node) {
        var variable_name = node.child(0);
        var type = node.child(2);
        var expression = node.child(4);
        var variable_size = parseInt(type.text.replace(/\D/g, ''));
        this.variables['&_' + variable_name.text] = type.text;
        var memory_allocation = "";
        for (var i = 0; i < variable_size/8; i++) {
            memory_allocation += "0";
        }
        this.data['&_' + variable_name.text] = memory_allocation;
        var _expression = this.handle(expression);
        var memory_access = new Content(CONTENT_TYPES.MEMORY, new Content(CONTENT_TYPES.DATA, '&_' + variable_name.text), get_datatype(type.text));
        const snapshot = structuredClone(this.variables);
        this.push_statement(node, new ByteCode(OP.ASSIGN, [false, memory_access].concat(_expression)), L2Draw, [snapshot]);
    }

    get_frame_size(variables) {
        var max = 0;
        for (var key in variables) {
            if (variables[key][0] > max) {
                max = variables[key][0];
            }
        }
        return max;
    }

    variables = {}
    head = null
    stack_pointer = 112;
    variable_pointer = 112;
    in_scope = false;
}

class StackFrame {
    next;
    variables;
    constructor() {
        this.next= null;
        this.variables = {};
    }
}

const Stack = {
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


var L2Draw = function(params, vm) {

    var container = document.getElementById("lx-container");

    var existing_table = container.querySelector("L2-table")
    if(existing_table){
        container.removeChild(existing_table)
    }

    var table = document.createElement("L2-table");
    table.style.width = "50%";
    table.style.border = "1p"
    variables = params[0];

    for(var name in variables){
        var row = document.createElement("tr");

        var nameCell = document.createElement("td");
        nameCell.textContent = name;
        row.appendChild(nameCell);


        var value = variables[name];
        var valueCell = document.createElement("td");
        //Check if scoped
        if(Array.isArray(value)){
            memory_access = new Content(CONTENT_TYPES.MEMORY, new Content(CONTENT_TYPES.NUMBER, 112-value[0]), get_datatype(value[1]))
        }else{
            memory_access = new Content(CONTENT_TYPES.MEMORY, new Content(CONTENT_TYPES.DATA, name), get_datatype(value))
        }
        
        valueCell.textContent = vm.read(memory_access);
        row.appendChild(valueCell);
        table.appendChild(row);
    }
    container.appendChild(table);
}