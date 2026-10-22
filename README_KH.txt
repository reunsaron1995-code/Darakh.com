DARAKH.COM — PROJECT FOR SERVER + AI (STARTER)

អ្វីដែលកំណែនេះអាចធ្វើបាន បន្ទាប់ពី Deploy និងដាក់ API key ត្រឹមត្រូវ៖
- បើកគេហទំព័រ Darakh.com តាម Server
- Upload វីដេអូ (MP4/MOV/WEBM/M4V) ទៅ Server
- AI ស្តាប់សំឡេងចិនជាអក្សរ និងបកប្រែអត្ថបទទៅភាសាខ្មែរ
- បង្ហាញអត្ថបទចិន និងអត្ថបទខ្មែរនៅលើទំព័រ

អ្វីដែលមិនទាន់មាន៖
- មិនទាន់បង្កើត MP4 ថ្មីដែលមានសំឡេងខ្មែរ ឬ Subtitle ស្រាប់ទេ
- មិនទាន់មាន Login ពិត, Google OAuth, database, user accounts ឬ admin authorization ពិតទេ
- ត្រូវធ្វើការសាកល្បងបន្ទាប់ពី deploy; មិនអាចធានាថាដំណើរការ 100% មុនសាកល្បងទេ

សុវត្ថិភាព:
- កុំដាក់ API key ក្នុង index.html ឬ GitHub
- កុំផ្ញើ API key/password មក ChatGPT
- ដាក់ OPENAI_API_KEY នៅក្នុង Environment Variables របស់ Render តែប៉ុណ្ណោះ
- API usage អាចគិតថ្លៃ។ សូមពិនិត្យតម្លៃ និងទទួលការយល់ព្រមពីមនុស្សពេញវ័យដែលជួយគ្រប់គ្រងគម្រោង មុនបើកការប្រើប្រាស់ដែលអាចគិតថ្លៃ។

DEPLOY (ត្រូវធ្វើនៅលើគណនីរបស់អ្នក):
1. Upload ឯកសារទាំងអស់ក្នុង folder នេះទៅ GitHub repository មួយ ដោយឱ្យ index.html, server.js, package.json និង Dockerfile នៅ root ដូចគ្នា។
2. ចូល Render ហើយបង្កើត New > Web Service; connect repository នោះ; ជ្រើស Docker runtime/ Dockerfile.
3. ពេល Deploy រួច ចូល Environment របស់ service ហើយបន្ថែម key OPENAI_API_KEY ជាមួយ API key របស់អ្នក។ កុំដាក់ key នៅក្នុង GitHub។
4. បើក https://YOUR-SERVICE.onrender.com/api/health ដើម្បីពិនិត្យថា server ឡើងហើយឬនៅ។
5. បើ health បង្ហាញ aiConfigured true នោះ server មើលឃើញ API key; ត្រូវសាកល្បង upload វីដេអូខ្លីមួយទៀត។

សម្គាល់៖ ខ្ញុំមិនអាចចូលគណនី GitHub/Render របស់អ្នក ឬ Deploy ជំនួសអ្នកពីក្នុង chat បានទេ។ ZIP នេះជាឯកសាររៀបចំសម្រាប់ជំហានបន្ទាប់ មិនមែនការភ្ជាប់ live រួចហើយទេ។
