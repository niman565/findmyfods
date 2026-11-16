// dotenv must load before the app is imported: the auth routes read
// SECRET_KEY when their modules load.
import 'dotenv/config';
import app from './app';

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
