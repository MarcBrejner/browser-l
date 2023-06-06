class L1Builder extends L0Builder {
    handle(node) {
        if (node.type === "goto") {
            this.goto(node)
        } else {
            return super.handle(node);
        }
    }

    goto(node) {
        var reader = node.child(1);
        var _reader1;
        if (reader.type === "label") {
            _reader1 = new Content(CONTENT_TYPES.LABEL, reader.text);
        } else if (reader.type === "register") {
            _reader1 = new Content(CONTENT_TYPES.REGISTER, reader.text);
        }
        var _reader2 = new Content(CONTENT_TYPES.NUMBER, 1);
        var _writer = new Content(CONTENT_TYPES.REGISTER, '$!');
        this.statements.push(new ByteCode(OP.ASSIGN_BIN, [true, _writer, _reader1, '-', _reader2]));
        this.set_ECS(node)
    }
}