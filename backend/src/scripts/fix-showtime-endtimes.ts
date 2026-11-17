import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Movie from '../models/Movie';
import Showtime from '../models/Showtime';
import Room from '../models/Room';
import Theater from '../models/Theater';

dotenv.config();
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/movie_booking');
  const _ = [Movie.modelName, Room.modelName, Theater.modelName];

  const showtimes = await Showtime.find().populate('movie', 'title duration');
  console.log(`Checking ${showtimes.length} showtimes...`);

  for (const s of showtimes) {
    const movie = s.movie as any;
    if (!movie || !movie.duration) continue;

    const start = new Date(s.startTime);
    const end = new Date(s.endTime);
    const durationMs = movie.duration * 60 * 1000;
    const expectedEnd = new Date(start.getTime() + durationMs);

    // Neu endTime lech hon 15 phut so voi startTime + duration
    if (Math.abs(end.getTime() - expectedEnd.getTime()) > 15 * 60 * 1000) {
      console.log(`Fixing showtime #${s._id.toString().slice(-6)} (${movie.title}):`);
      console.log(`  Old End: ${end.toISOString()} (${end.toLocaleString('vi-VN')})`);
      console.log(`  New End: ${expectedEnd.toISOString()} (${expectedEnd.toLocaleString('vi-VN')})`);
      s.endTime = expectedEnd;
      await s.save();
    }
  }

  console.log('Finished updating showtimes.');
  await mongoose.disconnect();
}

run();
