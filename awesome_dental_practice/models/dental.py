# -*- coding: utf-8 -*-

from random import randint
from odoo import api, fields, models, _
from odoo.exceptions import ValidationError

TEETH = [
            ('11', '11'),
            ('12', '12'),
            ('13', '13'),
            ('14', '14'),
            ('15', '15'),
            ('16', '16'),
            ('17', '17'),
            ('18', '18'),
            ('21', '21'),
            ('22', '22'),
            ('23', '23'),
            ('24', '24'),
            ('25', '25'),
            ('26', '26'),
            ('27', '27'),
            ('28', '28'),
            ('31', '31'),
            ('32', '32'),
            ('33', '33'),
            ('34', '34'),
            ('35', '35'),
            ('36', '36'),
            ('37', '37'),
            ('38', '38'),
            ('41', '41'),
            ('42', '42'),
            ('43', '43'),
            ('44', '44'),
            ('45', '45'),
            ('46', '46'),
            ('47', '47'),
            ('48', '48'),
    ]
POSITION = [
        ('outside', 'Outside'),
        ('top', 'Top'),
        ('inside', 'Inside'),
    ]
class Patient(models.Model):
    _description = "Patient"
    _inherit = "res.partner"

    intervention_ids = fields.One2many('account.move.line', 'patient_id', domain=[('product_id.type', '=', 'dental')])
    mouth_intervention_ids = fields.One2many('account.move.line', 'patient_id', domain=[('product_id.type', '=', 'dental'), ('product_id.dental_care_type', '=', 'mouth')])
    is_patient = fields.Boolean('Is Patient', compute='_compute_is_patient', store=True, readonly=False)

    @api.depends('intervention_ids')
    def _compute_is_patient(self):
        for partner in self:
            partner.is_patient = len(partner.intervention_ids) > 0


class Intervention(models.Model):
    _description = "Intervention"
    _inherit = "account.move.line"

    patient_id = fields.Many2one(related='move_id.partner_id', string='Patient')
    dental_care_type = fields.Selection(related='product_id.dental_care_type')
    color = fields.Integer(related='product_id.color')
    dental_tooth = fields.Selection(TEETH)
    dental_position = fields.Selection(POSITION)

    @api.constrains('product_id')
    def _check_product_id(self):
        for move_line in self:
            if move_line.product_id.type == 'dental' and move_line.product_id.dental_care_type in ['tooth', 'part']:
                if not move_line.dental_tooth:
                    raise ValidationError(_('This kind of intervention requires a tooth to be set'))
                if move_line.product_id.dental_care_type == 'part' and not move_line.dental_position:
                    raise ValidationError(_('This kind of intervantion requires a tooth part to be set'))



class ProductTemplate(models.Model):
    _inherit = 'product.template'

    def _get_default_color(self):
        return randint(1, 11)

    type = fields.Selection(selection_add=[
        ('dental', 'Dental Care'),
    ], ondelete={'dental': 'set service'})
    dental_care_type = fields.Selection([
        ('part', 'Part of the Tooth'),
        ('tooth', 'Whole Tooth'),
        ('mouth', 'Mouth'),
    ])
    color = fields.Integer('Color', default=_get_default_color)

    @api.onchange('type')
    def _onchange_type_event_booth(self):
        if self.type == 'dental':
            self.invoice_policy = 'order'

class Wizard(models.TransientModel):
    _name = 'dental.intervention.wizard'
    _description = 'Wizard dental intervention'

    partner_id = fields.Many2one('res.partner', 'Patient')
    product_id = fields.Many2one('product.product', 'Type', domain=[('type', '=', 'dental')])
    dental_care_type = fields.Selection(related='product_id.dental_care_type')
    dental_tooth = fields.Selection(TEETH)
    dental_position = fields.Selection(POSITION)

    @api.onchange('product_id')
    def _onchange_product_id(self):
        # a position only makes sense for part of a tooth: dropped along with
        # the field itself (invisible in the view) for a whole tooth or the mouth
        if self.dental_care_type != 'part':
            self.dental_position = False

    def add_intervention(self):
        self.ensure_one()
        open_move = self.partner_id.intervention_ids.move_id.filtered(lambda r: r.state == 'draft')
        if open_move:
            open_move.write({
                'line_ids': [(0, 0, {
                    'name': self.product_id.name,
                    'product_id': self.product_id.id,
                    'dental_tooth': self.dental_tooth,
                    'dental_position': self.dental_position,
                })]
            })
        else:
            self.env['account.move'].create({
                'partner_id': self.partner_id.id,
                'move_type': 'out_invoice',
                'line_ids': [(0, 0, {
                    'name': self.product_id.name,
                    'product_id': self.product_id.id,
                    'dental_tooth': self.dental_tooth,
                    'dental_position': self.dental_position,
                })]
            })
