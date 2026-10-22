Darakh.com — Chinese video to Khmer voice dubbing (starter)

អ្វីដែលកូដនេះព្យាយាមធ្វើ៖
1. ទទួលវីដេអូ MP4/MOV/WEBM/M4V (អតិបរមា 100 MB)។
2. ដកសំឡេងចេញ ហើយប្រើ OpenAI speech transcription ដើម្បីសរសេរភាសាចិន។
3. បកប្រែអត្ថបទចិនទៅជាភាសាខ្មែរ។
4. ប្រើ OpenAI text-to-speech ដើម្បីបង្កើតសំឡេងខ្មែរ។
5. បញ្ចូលសំឡេងខ្មែរជំនួសសំឡេងដើម ហើយបញ្ជូន MP4 ឱ្យទាញយក។

ដាក់ពង្រាយ៖
- ដាក់ឯកសារទាំងអស់ក្នុង root នៃ GitHub repository: index.html, server.js, package.json, Dockerfile, README_KH.txt.
- នៅ Render បង្កើត New > Web Service ហើយភ្ជាប់ GitHub repository នេះ។
- Environment: Runtime/Environment = Docker (Render should detect Dockerfile); set OPENAI_API_KEY as a secret environment variable. Never put the key in HTML, GitHub, chat, or screenshots.
- Optional: TTS_VOICE=alloy. You may try another supported voice if available.
- Deploy, then open https://YOUR-SERVICE.onrender.com/api/health. Expect JSON with ok:true and aiConfigured:true.
- Open the service URL itself to use the site.

សំខាន់ និងដែនកំណត់៖
- មិនទាន់មាន Google OAuth/login ពិតប្រាកដ, database, job queue, progress tracking, subtitles ឬ sync lip timing ទេ។
- សំឡេង TTS ជាភាសាខ្មែរអាចមិនសូវធម្មជាតិ ឬបញ្ចេញសំឡេងមិនល្អគ្រប់ពាក្យទេ; ត្រូវសាកល្បងមុនប្រើ។
- សំឡេងដើម/តន្ត្រីដើមត្រូវបានជំនួសដោយសំឡេងខ្មែរ។ វាមិនរក្សាតន្ត្រីផ្ទៃក្រោយទេ ហើយសំឡេងខ្មែរមិនទាន់ sync តាមពេលវេលានិយាយដើម។
- TTS/audio API calls អាចមានការគិតថ្លៃ។ សូមពិនិត្យតម្លៃ និងកំណត់ usage limits មុនប្រើ។ អ្នកប្រើអាយុក្រោម 18 គួរឱ្យមនុស្សពេញវ័យដែលទុកចិត្តជួយពិនិត្យការចំណាយ។
- Code has not been deployed or end-to-end tested. API/model availability, provider limits, server memory, and FFmpeg behavior must be tested after deployment.
- Do not upload private/confidential videos without permission. Ensure you have rights to process the video.
