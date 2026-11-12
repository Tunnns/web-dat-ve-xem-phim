import mongoose, { Schema, Document } from 'mongoose';

export interface IComboItem {
  name: string; // Tên thành phần (VD: "Bắp rang bơ")
  quantity: number; // Số lượng thành phần (VD: 1 bắp, 2 nước)
}

export interface ICombo extends Document {
  name: string; // Tên combo (VD: "Combo 1 Bắp + 1 Nước")
  description?: string;
  price: number; // Giá bán combo
  costPrice: number; // Giá vốn hiện tại của 1 combo (bình quân gia quyền khi nhập kho)
  stock: number; // Số lượng combo đang có trong kho
  minStock: number; // Ngưỡng tồn kho tối thiểu để cảnh báo sắp hết
  items: IComboItem[]; // Danh sách thành phần bắp/nước đi kèm
  image?: string;
  flavors?: string[]; // Danh sách các vị bắp có thể chọn (VD: ["Ngọt", "Phô mai", "Caramel", "Mặn"])
  isActive: boolean; // Còn bán hay đã ngừng
  createdAt: Date;
  updatedAt: Date;
}

const comboItemSchema = new Schema<IComboItem>(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const comboSchema = new Schema<ICombo>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    minStock: { type: Number, default: 10, min: 0 },
    items: { type: [comboItemSchema], default: [] },
    image: { type: String },
    flavors: { type: [String], default: ['Ngọt', 'Phô mai', 'Caramel', 'Mặn'] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<ICombo>('Combo', comboSchema);
