import dotenv from "dotenv";
dotenv.config();

import passport from "passport";
import axios from "axios";
import { Profile, Strategy as GoogleStrategy, VerifyCallback } from "passport-google-oauth20";
import User from "../models/User";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: VerifyCallback
    ) => {
      try {
        const { id, emails, name, photos } = profile;

        // 🔹 Chiamata a Google People API per ottenere i dati aggiuntivi
        const peopleRes = await axios.get(
          'https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses,photos,genders,birthdays,locations,phoneNumbers,organizations',
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        const googleData = peopleRes.data;

        let user = await User.findOne({ googleId: id });

        if (!user) {
          user = await User.create({
            googleId: id,
            email: emails?.[0].value,
            username: `${name?.givenName} ${name?.familyName}`,
            profilePicture: photos?.[0].value,
            role: "User",

            // Campi extra da Google People API
            gender: googleData?.genders?.[0]?.value,
            birthday: googleData?.birthdays?.[0]?.date
              ? new Date(
                  googleData.birthdays[0].date.year || 1970,
                  (googleData.birthdays[0].date.month || 1) - 1,
                  googleData.birthdays[0].date.day || 1
                )
              : undefined,
            location: googleData?.locations?.[0]?.formattedValue,
            phoneNumber: googleData?.phoneNumbers?.[0]?.value,
            organization: googleData?.organizations?.[0]
              ? {
                  name: googleData.organizations[0].name,
                  title: googleData.organizations[0].title,
                }
              : undefined,
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);
