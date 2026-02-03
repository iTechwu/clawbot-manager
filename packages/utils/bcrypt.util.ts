import * as bcrypt from 'bcrypt';
export default {
  compare(pass: string, password: string) {
    return bcrypt.compare(pass, password);
  },

  hashSync(password: string, length: number) {
    return bcrypt.hashSync(password, length);
  },
};
