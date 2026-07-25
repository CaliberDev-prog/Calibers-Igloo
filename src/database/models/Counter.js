import { Schema, model } from 'mongoose';

const counterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter = model('Counter', counterSchema);

export async function getNextTicketId() {
  const counter = await Counter.findByIdAndUpdate(
    'ticket',
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}
