const nodemailer = require('nodemailer');

module.exports.sendingMail = async({from, to, subject, text}) => {
  try {
    let mailOptions = ({
      fromt,
      to,
      subject,
      text,
    })

    const Transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
    });
    return await Transporter.sendMail(mailOptions) 
  } catch (error) {
    console.log(error)
  }
}
