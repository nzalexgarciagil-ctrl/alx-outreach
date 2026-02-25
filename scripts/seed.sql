-- ALX Outreach Mock Data Seed
-- Run with: sqlite3 ~/.config/alx-outreach/alx-outreach.db < scripts/seed.sql

-- Clear existing data
DELETE FROM replies;
DELETE FROM emails;
DELETE FROM campaign_leads;
DELETE FROM campaigns;
DELETE FROM templates;
DELETE FROM leads;
DELETE FROM niches;
DELETE FROM daily_send_log;

-- Niches
INSERT INTO niches (id, name, description, color) VALUES
  ('niche-re', 'Real Estate', 'Real estate agencies and agents', '#ef4444'),
  ('niche-dental', 'Dental', 'Dental clinics and practices', '#3b82f6'),
  ('niche-gym', 'Gym & Fitness', 'Gyms, personal trainers, fitness studios', '#22c55e'),
  ('niche-rest', 'Restaurants', 'Restaurants, cafes, and food businesses', '#f97316'),
  ('niche-auto', 'Auto Dealers', 'Car dealerships and automotive businesses', '#8b5cf6');

-- Leads (25 leads across niches)
INSERT INTO leads (id, niche_id, first_name, last_name, email, company, website, email_valid, status) VALUES
  ('lead-01', 'niche-re', 'Sarah', 'Johnson', 'sarah@premierrealty.com', 'Premier Realty', 'premierrealty.com', 1, 'new'),
  ('lead-02', 'niche-re', 'Michael', 'Chen', 'michael@cityhomes.com', 'City Homes', 'cityhomes.com', 1, 'new'),
  ('lead-03', 'niche-re', 'Emily', 'Rodriguez', 'emily@luxuryestates.com', 'Luxury Estates', 'luxuryestates.com', 1, 'contacted'),
  ('lead-04', 'niche-re', 'James', 'Williams', 'james@topagent.com', 'Top Agent Group', 'topagent.com', 1, 'interested'),
  ('lead-05', 'niche-re', 'Amanda', 'Foster', 'amanda@fosterrealestate.com', 'Foster Real Estate', 'fosterrealestate.com', 0, 'new'),

  ('lead-06', 'niche-dental', 'Dr. Robert', 'Patel', 'robert@brightsmiledental.com', 'Bright Smile Dental', 'brightsmiledental.com', 1, 'new'),
  ('lead-07', 'niche-dental', 'Dr. Lisa', 'Martinez', 'lisa@gentledentistry.com', 'Gentle Dentistry', 'gentledentistry.com', 1, 'contacted'),
  ('lead-08', 'niche-dental', 'Dr. Kevin', 'Nguyen', 'kevin@smilecareclinic.com', 'SmileCare Clinic', 'smilecareclinic.com', 1, 'new'),
  ('lead-09', 'niche-dental', 'Dr. Rachel', 'Thompson', 'rachel@moderndentalarts.com', 'Modern Dental Arts', 'moderndentalarts.com', 1, 'interested'),
  ('lead-10', 'niche-dental', 'Dr. David', 'Kim', 'david@premiumdental.com', 'Premium Dental', 'premiumdental.com', 1, 'new'),

  ('lead-11', 'niche-gym', 'Marcus', 'Stone', 'marcus@ironworksgym.com', 'IronWorks Gym', 'ironworksgym.com', 1, 'new'),
  ('lead-12', 'niche-gym', 'Jessica', 'Taylor', 'jessica@fitlifestudio.com', 'FitLife Studio', 'fitlifestudio.com', 1, 'contacted'),
  ('lead-13', 'niche-gym', 'Chris', 'Anderson', 'chris@peakperformance.com', 'Peak Performance', 'peakperformance.com', 1, 'new'),
  ('lead-14', 'niche-gym', 'Samantha', 'Lee', 'sam@flexzone.com', 'FlexZone Fitness', 'flexzone.com', 1, 'not_interested'),
  ('lead-15', 'niche-gym', 'Tyler', 'Brooks', 'tyler@elitefit.com', 'Elite Fit', 'elitefit.com', 1, 'new'),

  ('lead-16', 'niche-rest', 'Antonio', 'Rossi', 'antonio@bellavista.com', 'Bella Vista', 'bellavista.com', 1, 'new'),
  ('lead-17', 'niche-rest', 'Grace', 'Park', 'grace@sakurasushi.com', 'Sakura Sushi', 'sakurasushi.com', 1, 'new'),
  ('lead-18', 'niche-rest', 'Daniel', 'Murphy', 'daniel@thesteakhouse.com', 'The Steakhouse', 'thesteakhouse.com', 1, 'contacted'),
  ('lead-19', 'niche-rest', 'Sofia', 'Garcia', 'sofia@casablanca.com', 'Casa Blanca', 'casablanca.com', 1, 'new'),
  ('lead-20', 'niche-rest', 'Ryan', 'Cooper', 'ryan@farmtotable.com', 'Farm To Table', 'farmtotable.com', 1, 'interested'),

  ('lead-21', 'niche-auto', 'Brandon', 'Mitchell', 'brandon@speedautodeals.com', 'Speed Auto Deals', 'speedautodeals.com', 1, 'new'),
  ('lead-22', 'niche-auto', 'Olivia', 'Wilson', 'olivia@elitemotors.com', 'Elite Motors', 'elitemotors.com', 1, 'new'),
  ('lead-23', 'niche-auto', 'Nathan', 'Harris', 'nathan@driveawayautos.com', 'DriveAway Autos', 'driveawayautos.com', 1, 'contacted'),
  ('lead-24', 'niche-auto', 'Lauren', 'Clark', 'lauren@premiercars.com', 'Premier Cars', 'premiercars.com', 1, 'new'),
  ('lead-25', NULL, 'Alex', 'Turner', 'alex@freelance.com', 'Freelance', 'freelance.com', 1, 'new');

-- Templates
INSERT INTO templates (id, niche_id, name, subject, body) VALUES
  ('tmpl-re-01', 'niche-re', 'Real Estate Video Intro', 'Video Content That Sells Properties — {{first_name}}', 'Hi {{first_name}},

I came across {{company}} and was really impressed by your listings. In today''s market, video content is everything — 73% of homeowners prefer agents who use video marketing.

I help real estate professionals like you create stunning property tours and brand videos that:
- Showcase listings in the best light
- Build trust with potential buyers
- Dominate social media feeds

Would you be open to a quick 10-minute call this week to discuss how video could help {{company}} stand out?

Best,
ALX'),

  ('tmpl-dental-01', 'niche-dental', 'Dental Practice Video', 'Attract More Patients with Video — {{company}}', 'Hi {{first_name}},

I noticed {{company}} on {{website}} and wanted to reach out. Video content is one of the most effective ways for dental practices to attract new patients — people want to see the office and meet the team before booking.

I specialize in creating professional video content for dental practices, including:
- Virtual office tours
- Meet-the-team videos
- Patient testimonial videos
- Social media content

Would you be interested in a brief chat about how video could bring more patients through your doors?

Cheers,
ALX'),

  ('tmpl-gym-01', 'niche-gym', 'Gym Video Content', 'Level Up Your Gym''s Social Media — {{first_name}}', 'Hey {{first_name}},

I love what you''re building at {{company}}! I help fitness businesses create video content that actually converts followers into members.

Think:
- High-energy gym promo videos
- Trainer spotlight reels
- Transformation story videos
- Social media content that stops the scroll

Interested in leveling up {{company}}''s video game? Let me know if you''d be up for a quick chat.

ALX'),

  ('tmpl-rest-01', 'niche-rest', 'Restaurant Video', 'Make {{company}} Go Viral — Video Content', 'Hi {{first_name}},

Food content is dominating social media right now. I help restaurants like {{company}} create mouthwatering video content that drives reservations and foot traffic.

What I offer:
- Cinematic food videos
- Behind-the-kitchen-scenes content
- Chef spotlight videos
- TikTok & Instagram Reels

I''d love to show you some examples of my work and discuss how we can make {{company}} the talk of the town. Free for a quick call?

ALX'),

  ('tmpl-general', NULL, 'General Video Outreach', 'Professional Video Content for {{company}}', 'Hi {{first_name}},

I help businesses like {{company}} create professional video content that converts. Whether it''s a brand video, social media content, or promotional material — I make sure your message hits the right note.

Would love to chat about what video could do for your business. Got 10 minutes this week?

Best,
ALX');

-- Campaigns (3 campaigns)
INSERT INTO campaigns (id, name, niche_id, template_id, status, total_leads, total_sent, total_replied, total_interested) VALUES
  ('camp-01', 'Real Estate Q1 Push', 'niche-re', 'tmpl-re-01', 'drafts_ready', 5, 0, 0, 0),
  ('camp-02', 'Dental Outreach', 'niche-dental', 'tmpl-dental-01', 'active', 5, 3, 2, 1),
  ('camp-03', 'Gym Owners Video', 'niche-gym', 'tmpl-gym-01', 'completed', 5, 5, 3, 2);

-- Campaign Leads
INSERT INTO campaign_leads (campaign_id, lead_id) VALUES
  ('camp-01', 'lead-01'), ('camp-01', 'lead-02'), ('camp-01', 'lead-03'), ('camp-01', 'lead-04'), ('camp-01', 'lead-05'),
  ('camp-02', 'lead-06'), ('camp-02', 'lead-07'), ('camp-02', 'lead-08'), ('camp-02', 'lead-09'), ('camp-02', 'lead-10'),
  ('camp-03', 'lead-11'), ('camp-03', 'lead-12'), ('camp-03', 'lead-13'), ('camp-03', 'lead-14'), ('camp-03', 'lead-15');

-- Emails for campaign 1 (drafts)
INSERT INTO emails (id, campaign_id, lead_id, template_id, subject, body, personalization_notes, status) VALUES
  ('email-01', 'camp-01', 'lead-01', 'tmpl-re-01', 'Video Content That Sells Properties — Sarah', 'Hi Sarah,

I came across Premier Realty and was really impressed by your listings. In today''s market, video content is everything — 73% of homeowners prefer agents who use video marketing.

I noticed your recent listings on premierrealty.com showcase some stunning properties. A cinematic video tour would really make them pop.

I help real estate professionals like you create stunning property tours and brand videos. Would you be open to a quick 10-minute call this week?

Best,
ALX', 'Mentioned their impressive property listings on premierrealty.com', 'draft'),

  ('email-02', 'camp-01', 'lead-02', 'tmpl-re-01', 'Video Content That Sells Properties — Michael', 'Hi Michael,

I came across City Homes and was really impressed by your listings. Video content is the #1 tool for selling properties in 2026.

I''d love to help City Homes create property tours that convert viewers into buyers. Would you be open to a quick chat?

Best,
ALX', 'Referenced City Homes brand name', 'draft'),

  ('email-03', 'camp-01', 'lead-03', 'tmpl-re-01', 'Video Content That Sells Properties — Emily', 'Hi Emily,

Luxury Estates clearly has an eye for premium properties. I think professional video content would be the perfect complement to your brand.

Interested in a quick call to discuss? I have some ideas specifically for luxury property marketing.

Best,
ALX', 'Focused on the luxury angle matching their brand', 'approved');

-- Emails for campaign 2 (mix of sent and drafts)
INSERT INTO emails (id, campaign_id, lead_id, template_id, subject, body, personalization_notes, status, sent_at) VALUES
  ('email-04', 'camp-02', 'lead-06', 'tmpl-dental-01', 'Attract More Patients with Video — Bright Smile Dental', 'Hi Dr. Robert,

I noticed Bright Smile Dental on brightsmiledental.com and wanted to reach out. Your practice looks fantastic — I think a virtual tour video would really help new patients feel comfortable before their first visit.

Would you be interested in a brief chat?

Cheers,
ALX', 'Mentioned their website and patient comfort angle', 'sent', '2026-02-20 10:30:00'),

  ('email-05', 'camp-02', 'lead-07', 'tmpl-dental-01', 'Attract More Patients with Video — Gentle Dentistry', 'Hi Dr. Lisa,

Gentle Dentistry is a great name — it really speaks to patient comfort. I create video content that helps dental practices like yours build trust online.

Quick chat sometime this week?

Cheers,
ALX', 'Complimented their brand name and comfort focus', 'sent', '2026-02-20 10:45:00'),

  ('email-06', 'camp-02', 'lead-08', 'tmpl-dental-01', 'Attract More Patients with Video — SmileCare Clinic', 'Hi Dr. Kevin,

SmileCare Clinic looks like an amazing practice. Video content could be a game-changer for attracting new patients — especially a meet-the-team video.

Got 10 minutes for a call?

Cheers,
ALX', 'Suggested meet-the-team video for their clinic', 'sent', '2026-02-21 09:15:00');

-- Emails for campaign 2 (unsent)
INSERT INTO emails (id, campaign_id, lead_id, template_id, subject, body, personalization_notes, status) VALUES
  ('email-07', 'camp-02', 'lead-09', 'tmpl-dental-01', 'Attract More Patients with Video — Modern Dental Arts', 'Hi Dr. Rachel,

I saw Modern Dental Arts online and was impressed by your modern approach. I create professional videos for dental practices. Interested?

Cheers,
ALX', 'Noted their modern approach', 'approved'),

  ('email-08', 'camp-02', 'lead-10', 'tmpl-dental-01', 'Attract More Patients with Video — Premium Dental', 'Hi Dr. David,

Premium Dental clearly takes quality seriously. I''d love to help showcase that with professional video content. Quick call?

Cheers,
ALX', 'Highlighted their premium positioning', 'draft');

-- Emails for campaign 3 (all sent)
INSERT INTO emails (id, campaign_id, lead_id, template_id, subject, body, personalization_notes, status, sent_at) VALUES
  ('email-09', 'camp-03', 'lead-11', 'tmpl-gym-01', 'Level Up Your Gym''s Social Media — Marcus', 'Hey Marcus, Love what you''re building at IronWorks Gym! Let''s chat about video. ALX', 'Short and punchy for gym owners', 'sent', '2026-02-10 14:00:00'),
  ('email-10', 'camp-03', 'lead-12', 'tmpl-gym-01', 'Level Up Your Gym''s Social Media — Jessica', 'Hey Jessica, FitLife Studio looks amazing! Let me help you create killer gym content. ALX', 'Complimented their studio', 'sent', '2026-02-10 14:25:00'),
  ('email-11', 'camp-03', 'lead-13', 'tmpl-gym-01', 'Level Up Your Gym''s Social Media — Chris', 'Hey Chris, Peak Performance deserves peak content! Let''s chat about gym promo videos. ALX', 'Played on their brand name', 'sent', '2026-02-11 10:00:00'),
  ('email-12', 'camp-03', 'lead-14', 'tmpl-gym-01', 'Level Up Your Gym''s Social Media — Samantha', 'Hey Sam, FlexZone looks like an incredible space! I create video content for gyms. Interested? ALX', 'Casual tone for gym audience', 'sent', '2026-02-11 10:30:00'),
  ('email-13', 'camp-03', 'lead-15', 'tmpl-gym-01', 'Level Up Your Gym''s Social Media — Tyler', 'Hey Tyler, Elite Fit is clearly elite! Let me help showcase that with video. ALX', 'Punchy opening', 'sent', '2026-02-12 09:00:00');

-- Replies (for campaigns 2 and 3)
INSERT INTO replies (id, email_id, lead_id, from_email, subject, body, snippet, classification, classification_confidence, classification_reasoning, is_read, received_at) VALUES
  ('reply-01', 'email-04', 'lead-06', 'robert@brightsmiledental.com', 'Re: Attract More Patients with Video', 'Hi ALX,

Thanks for reaching out! We''ve actually been thinking about getting some video content done for our practice. A virtual tour sounds like exactly what we need.

Could you send over some examples of your work and pricing? We''d definitely be interested in setting up a call.

Best,
Dr. Robert Patel', 'Thanks for reaching out! We''ve actually been thinking about getting some video content...', 'interested', 0.95, 'Explicitly asked for examples and pricing, expressed clear interest in video services', 1, '2026-02-21 15:30:00'),

  ('reply-02', 'email-05', 'lead-07', 'lisa@gentledentistry.com', 'Re: Attract More Patients with Video', 'Hi,

Thanks but we already have a marketing agency handling our video content. Appreciate the offer though!

Dr. Lisa', 'Thanks but we already have a marketing agency handling our video content.', 'not_interested', 0.92, 'Already has a marketing agency, politely declined', 1, '2026-02-22 09:15:00'),

  ('reply-03', 'email-09', 'lead-11', 'marcus@ironworksgym.com', 'Re: Level Up Your Gym''s Social Media', 'Yo ALX!

Dude this is perfect timing. We just renovated the gym and I''ve been wanting to get some sick promo videos done. What kind of packages do you offer?

Let''s definitely talk.

Marcus', 'Dude this is perfect timing. We just renovated the gym and I''ve been wanting...', 'interested', 0.97, 'Very enthusiastic, just renovated, asking about packages - strong buying signal', 0, '2026-02-13 11:00:00'),

  ('reply-04', 'email-10', 'lead-12', 'jessica@fitlifestudio.com', 'Re: Level Up Your Gym''s Social Media', 'Hi ALX,

Interesting! We are thinking about expanding our social media presence. Can you follow up with me in a couple of weeks? I''m in the middle of opening a new location.

Thanks,
Jessica', 'Can you follow up with me in a couple of weeks? I''m in the middle of opening...', 'follow_up', 0.88, 'Interested but busy with new location opening, requested follow-up in a few weeks', 0, '2026-02-14 16:45:00'),

  ('reply-05', 'email-12', 'lead-14', 'sam@flexzone.com', 'Re: Level Up Your Gym''s Social Media', 'Not interested, please don''t email me again.', 'Not interested, please don''t email me again.', 'not_interested', 0.99, 'Explicit rejection and request to stop emailing', 1, '2026-02-12 14:00:00');

-- Daily send log
INSERT INTO daily_send_log (date, count) VALUES
  ('2026-02-10', 2),
  ('2026-02-11', 2),
  ('2026-02-12', 1),
  ('2026-02-20', 2),
  ('2026-02-21', 1),
  ('2026-02-26', 0);
