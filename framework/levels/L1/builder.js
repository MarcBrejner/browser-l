class L1Visitor extends L0Visitor {  
    goto(node) {
        var reader = node.child(1);
        var pos = this.visit(reader);
        this._emitter.goto(node,pos)
    }
}

class L1Emitter extends L0Emitter{
    goto(node,pos){
        this.assignment(node,
            true, 
            this.register('$!'), 
            this.binary_expression(node, pos, '-', this.number(1)));
    }
}