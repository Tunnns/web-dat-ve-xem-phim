import React, { useEffect, useState } from 'react';
import { App, Button, Divider, Form, Input, InputNumber, Modal, Space, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { getPricingRule, updatePricingRule } from '../../api/pricing';
import { getErrorMessage } from '../../api/client';
import type { PricingRule } from '../../api/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (rule: PricingRule) => void;
}

const PricingRuleModal: React.FC<Props> = ({ open, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<PricingRule>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    getPricingRule()
      .then((rule) => form.setFieldsValue(rule))
      .catch((e) => message.error(getErrorMessage(e)));
  }, [open, form, message]);

  const submit = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    setSaving(true);
    try {
      const payload: PricingRule = {
        timeSlots: values.timeSlots ?? [],
        weekendSurcharge: values.weekendSurcharge ?? 0,
        holidays: values.holidays ?? [],
      };
      await updatePricingRule(payload);
      message.success('Cập nhật bảng giá thành công');
      onSaved(payload);
      onClose();
    } catch (e) {
      message.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const money = (
    <InputNumber min={0} step={5000} style={{ width: 130 }} addonAfter="đ" />
  );

  return (
    <Modal
      title="Bảng giá theo khung giờ / cuối tuần / ngày lễ"
      open={open}
      onCancel={onClose}
      onOk={() => void submit()}
      confirmLoading={saving}
      okText="Lưu bảng giá"
      cancelText="Hủy"
      width={720}
    >
      <Typography.Paragraph type="secondary">
        Giá cuối = giá gốc của suất + phụ phí khung giờ + phụ phí cuối tuần/ngày lễ (lấy mức cao hơn nếu trùng).
        Vé đã bán giữ nguyên giá.
      </Typography.Paragraph>
      <Form form={form} layout="vertical">
        <Divider>Khung giờ (giờ Việt Nam)</Divider>
        <Form.List name="timeSlots">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name }) => (
                <Space key={key} align="baseline" wrap>
                  <Form.Item name={[name, 'name']} rules={[{ required: true, message: 'Nhập tên' }]}>
                    <Input placeholder="Tên (Sáng/Tối...)" style={{ width: 150 }} />
                  </Form.Item>
                  <Form.Item
                    name={[name, 'from']}
                    rules={[{ required: true, pattern: /^([01]\d|2[0-3]):[0-5]\d$/, message: 'HH:mm' }]}
                  >
                    <Input placeholder="Từ HH:mm" style={{ width: 100 }} />
                  </Form.Item>
                  <Form.Item
                    name={[name, 'to']}
                    rules={[{ required: true, pattern: /^(([01]\d|2[0-3]):[0-5]\d|24:00)$/, message: 'HH:mm' }]}
                  >
                    <Input placeholder="Đến HH:mm" style={{ width: 100 }} />
                  </Form.Item>
                  <Form.Item name={[name, 'surcharge']} initialValue={0}>{money}</Form.Item>
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                </Space>
              ))}
              <Button
                icon={<PlusOutlined />}
                onClick={() => add({ name: '', from: '00:00', to: '24:00', surcharge: 0 })}
              >
                Thêm khung giờ
              </Button>
            </>
          )}
        </Form.List>

        <Divider>Cuối tuần (Thứ 7, Chủ nhật)</Divider>
        <Form.Item name="weekendSurcharge" label="Phụ phí cuối tuần">
          {money}
        </Form.Item>

        <Divider>Ngày lễ</Divider>
        <Form.List name="holidays">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name }) => (
                <Space key={key} align="baseline" wrap>
                  <Form.Item
                    name={[name, 'date']}
                    rules={[{ required: true, pattern: /^(\d{4}-)?\d{2}-\d{2}$/, message: 'MM-DD hoặc YYYY-MM-DD' }]}
                  >
                    <Input placeholder="MM-DD hoặc YYYY-MM-DD" style={{ width: 190 }} />
                  </Form.Item>
                  <Form.Item name={[name, 'name']} rules={[{ required: true, message: 'Nhập tên' }]}>
                    <Input placeholder="Tên ngày lễ" style={{ width: 200 }} />
                  </Form.Item>
                  <Form.Item name={[name, 'surcharge']} initialValue={0}>{money}</Form.Item>
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                </Space>
              ))}
              <Button icon={<PlusOutlined />} onClick={() => add({ date: '', name: '', surcharge: 0 })}>
                Thêm ngày lễ
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
};

export default PricingRuleModal;