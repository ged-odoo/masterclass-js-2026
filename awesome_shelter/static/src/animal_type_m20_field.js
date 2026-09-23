import { registry } from "@web/core/registry";
import { Many2OneField, buildM2OFieldDescription } from "@web/views/fields/many2one/many2one_field";
import { imageUrl } from "@web/core/utils/urls";
import { useProps, types as t, useEffect, signal } from "@odoo/owl";

const field = buildM2OFieldDescription(Many2OneField);

class AnimalTypeManyToOne extends Many2OneField {
    static template = "shelter.AnimalTypeManyToOne";
    // this.props stays Many2OneField's own inherited declaration - only the
    // one prop this class actually adds needs declaring, as its own field
    newProps = useProps({ imageField: t.string() });
    key = signal(1);

    setup() {
        super.setup();
        useEffect(() => {
            // only observing it
            this.props.record.data[this.props.name];
            this.key.set(this.key() + 1);
            console.log("here", this.key(), this.props.record.data[this.props.name]);
        });
    }
    get pictogramUrl() {
        return imageUrl(this.props.record.resModel, this.props.record.resId, this.newProps.imageField);
    }

    get hasImage() {
        return Boolean(this.props.record.data[this.newProps.imageField]);
    }
}

const animalTypeManyToOne = {
    ...field,
    component: AnimalTypeManyToOne,
    fieldDependencies: [...field.fieldDependencies || [], { name: "pictogram", type: "image" }],
    extractProps({ options }) {
        const props = field.extractProps(...arguments);
        props.imageField = options.image_field;
        return props;
    },
};

registry.category("fields").add("animal_type_many2one", animalTypeManyToOne);