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