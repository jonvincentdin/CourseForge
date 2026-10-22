# COURSEFORGE — COMPLETE CLAUDE DEVELOPMENT PROMPT
 
You are an expert full-stack software engineer, system architect, database architect, UI/UX designer, security engineer, AI integration engineer, and product engineer.
 
Your task is to progressively build and improve a production-quality web application called:
 
# CourseForge
 
### Tagline
 
**Turn Your Syllabus Into a Course.**
 
CourseForge is a student-focused learning platform that allows users to upload their university syllabus, organize subjects by academic year and semester, select one or multiple subjects, and generate structured learning courses from those subjects.
 
CourseForge should support:
 
* Syllabus PDF upload
* Syllabus extraction and organization
* Academic year selection
* Semester selection
* Multiple subject selection
* Direct AI course generation
* External AI prompt + JSON course generation
* JSON course importing
* Markdown-based course content
* Modular courses
* Module quizzes
* Course progress
* Course management
* Course export
* Course sharing
* Public share links
* Private course sharing
* "Add to My Courses"
* Independent course copies
* User authentication
* Secure user-provided AI API keys
* Persistent syllabus storage
* Persistent course storage
 
The final product should feel like a real educational platform that students would genuinely use.
 
It must NOT feel like:
 
* A generic CRUD project
* A basic PDF uploader
* A generic AI wrapper
* A school administration dashboard
* A simple form-based project
 
It should feel polished, useful, fast, secure, and thoughtfully designed.
 
---
 
# 1. CRITICAL DEVELOPMENT RULE
 
Before doing ANY substantial implementation:
 
1. Inspect the entire repository.
2. Understand the existing tech stack.
3. Inspect the existing file structure.
4. Inspect the existing functionality.
5. Read EVERY file inside `.context`.
6. Read `MILESTONES.md`.
7. Determine the actual current milestone.
8. Determine which milestones are complete.
9. Determine which milestones are partially implemented.
10. Identify the most important unfinished milestone.
11. Continue implementation from that point.
 
DO NOT blindly start rebuilding the project.
 
DO NOT reset the repository.
 
DO NOT delete working features unnecessarily.
 
DO NOT assume the repository is empty.
 
DO NOT assume previous work is correct.
 
DO NOT assume a milestone is complete simply because a UI exists.
 
Always inspect the actual implementation.
 
If functionality already exists:
 
* Preserve it.
* Improve it.
* Refactor only when necessary.
* Avoid unnecessary rewrites.
 
The goal is progressive development.
 
---
 
# 2. REQUIRED `.context` SYSTEM
 
Create a `.context` directory at the root of the project.
 
Claude MUST read the `.context` directory before making substantial changes.
 
Recommended structure:
 
```text
.context/
├── README.md
├── PROJECT.md
├── ARCHITECTURE.md
├── DATABASE.md
├── UI_UX.md
├── AI_GENERATION.md
├── SYLLABUS_PROCESSING.md
├── COURSE_SCHEMA.md
├── SHARING.md
├── SECURITY.md
├── DEVELOPMENT.md
├── MILESTONES.md
└── DECISIONS.md
```
 
The exact structure may be expanded if useful.
 
The `.context` directory is the project's long-term memory.
 
It must describe the REAL current state of the application.
 
Do not write fictional documentation.
 
Whenever meaningful changes are made, update the relevant context files.
 
---
 
# 3. `.context/README.md`
 
Document:
 
* What CourseForge is
* Product purpose
* Target users
* Main workflow
* Development rules
* How Claude should use the context
* Current project status
 
---
 
# 4. `.context/PROJECT.md`
 
Document:
 
* Product vision
* Product goals
* Target users
* Main features
* User workflow
* Current implementation
* Planned features
* Important constraints
* Product terminology
 
---
 
# 5. `.context/ARCHITECTURE.md`
 
Document:
 
* Framework
* Frontend architecture
* Backend architecture
* Routing
* API architecture
* Services
* Components
* File structure
* Data flow
* Authentication architecture
* AI architecture
* Course architecture
* Sharing architecture
 
---
 
# 6. `.context/DATABASE.md`
 
Document:
 
* Database technology
* Models/tables
* Relationships
* Indexes
* Storage
* Syllabus relationships
* Course relationships
* Progress relationships
* Sharing relationships
* Course-copy relationships
 
---
 
# 7. `.context/UI_UX.md`
 
Document:
 
* Design system
* Typography
* Colors
* Spacing
* Navigation
* Components
* Layout rules
* Responsive behavior
* Accessibility
* Animation rules
* Empty states
* Loading states
* Error states
 
---
 
# 8. `.context/AI_GENERATION.md`
 
Document:
 
* AI provider architecture
* Provider abstraction
* Prompt structure
* Direct generation workflow
* External AI workflow
* JSON generation
* JSON validation
* API key handling
* AI errors
* AI generation quality requirements
 
---
 
# 9. `.context/SYLLABUS_PROCESSING.md`
 
Document:
 
* PDF upload
* File validation
* PDF extraction
* Text processing
* Subject detection
* Year detection
* Semester detection
* Review/edit workflow
* Syllabus persistence
* Syllabus versioning
 
---
 
# 10. `.context/COURSE_SCHEMA.md`
 
Document:
 
* Course schema
* Module schema
* Quiz schema
* Markdown requirements
* JSON schema
* Schema versions
* Import/export
* Validation
 
---
 
# 11. `.context/SHARING.md`
 
Document:
 
* Public link sharing
* Private sharing
* Share permissions
* Share tokens
* Invitations
* Authorization
* Course viewer
* Owner permissions
* Viewer permissions
* Add to My Courses
* Course copies
* Authentication redirect
* Progress isolation
* Revocation
* Security
* Future synchronization possibilities
 
---
 
# 12. `.context/SECURITY.md`
 
Document:
 
* Authentication
* Authorization
* API key encryption
* File validation
* Markdown sanitization
* JSON validation
* Share-token security
* Private-course access
* XSS prevention
* Data isolation
* API security
* Course-copy security
 
---
 
# 13. `.context/DEVELOPMENT.md`
 
Document:
 
* Development commands
* Environment variables
* Testing
* Build process
* Deployment
* Coding conventions
* Important implementation notes
 
---
 
# 14. `.context/MILESTONES.md`
 
Maintain the actual project milestone state.
 
Use:
 
```text
[ ] Not started
[~] In progress
[✓] Complete
[!] Needs attention
```
 
Never mark a milestone complete merely because some UI exists.
 
---
 
# 15. `.context/DECISIONS.md`
 
Document important technical decisions.
 
For example:
 
```text
Decision:
User-provided AI API keys are encrypted before persistence.
 
Reason:
API keys must never be exposed to client-side code.
 
Date:
YYYY-MM-DD
```
 
Record important architectural decisions here.
 
---
 
# 16. CORE USER WORKFLOW
 
The main workflow should be:
 
```text
Login
   ↓
Dashboard
   ↓
Upload Syllabus
   ↓
Process Syllabus PDF
   ↓
Extract Subjects
   ↓
Review / Edit Extracted Subjects
   ↓
Select Academic Year
   ↓
Select Semester
   ↓
Select One or Multiple Subjects
   ↓
Choose Course Generation Method
   ├── Direct AI Generation
   └── External AI Prompt + JSON
   ↓
Generate / Import Course
   ↓
Course Viewer
   ↓
Modules
   ↓
Markdown Lessons
   ↓
Module Quiz
   ↓
Track Progress
   ↓
Manage / Export / Share Course
```
 
The user should only need to upload a syllabus once.
 
After it is stored, they should be able to generate courses from other subjects without uploading the syllabus again.
 
---
 
# 17. APPLICATION BRANDING
 
The official application name is:
 
**CourseForge**
 
Do not use previous names such as:
 
* Syllabuild
* Reviso
* Memora
 
Use CourseForge consistently.
 
Primary tagline:
 
**Turn Your Syllabus Into a Course.**
 
The design should feel:
 
* Modern
* Academic
* Technical
* Professional
* Clean
* Student-focused
 
---
 
# 18. AUTHENTICATION
 
Implement secure authentication.
 
Users should have their own accounts.
 
Users must only access their own private:
 
* Syllabi
* Courses
* Progress
* AI configuration
* Private shares
* Settings
 
Never allow cross-user data access.
 
Authentication is also required when a user wants to save a shared course into their own CourseForge library.
 
---
 
# 19. DASHBOARD
 
Create a polished student-focused dashboard.
 
Display:
 
* Current academic year
* Current semester
* Available subjects
* Recently generated courses
* Course progress
* Stored syllabi
* Quick actions
 
Example:
 
```text
CourseForge
 
Good afternoon!
 
Current Semester
2nd Year · 1st Semester
 
Your Subjects
 
[ Data Structures ]
[ Network 1 ]
[ Object-Oriented Programming ]
 
Recently Generated
 
Data Structures
████████░░ 80%
 
Network 1
████░░░░░░ 40%
 
Quick Actions
 
[ Generate Course ]
[ Upload Syllabus ]
```
 
Do NOT make the dashboard look like a generic administration system.
 
---
 
# 20. SYLLABUS UPLOAD
 
The application MUST accept syllabus PDF files.
 
Workflow:
 
```text
Upload PDF
↓
Validate File
↓
Extract Text
↓
Analyze Structure
↓
Detect Academic Years
↓
Detect Semesters
↓
Detect Subjects
↓
Review Results
↓
Save
```
 
Validate:
 
* File type
* File size
* File integrity
 
Handle imperfect PDFs gracefully.
 
If extraction is uncertain, do not silently invent information.
 
Allow users to review and correct extracted information.
 
---
 
# 21. EXTRACTED SYLLABUS DATA
 
Allow editing of:
 
* Subject name
* Subject code
* Description
* Academic year
* Semester
* Units
* Other useful metadata
 
Example:
 
```text
Detected Subjects
 
Year 2
 
1st Semester
 
☑ Data Structures and Algorithms
☑ Network 1
☑ Object-Oriented Programming
 
2nd Semester
 
☑ Web Development
☑ Database Systems
```
 
---
 
# 22. SYLLABUS STORAGE
 
The syllabus must be persistent.
 
Store:
 
* Original PDF
* Syllabus metadata
* Extracted text where appropriate
* Extracted structure
* Subjects
* Academic years
* Semesters
 
Do not treat the PDF as a temporary upload.
 
Users should be able to return later and use their existing syllabus.
 
---
 
# 23. MY SYLLABI
 
Create a dedicated Syllabi page.
 
Example:
 
```text
My Syllabi
 
2026–2027 Curriculum
24 Subjects
Uploaded September 2026
 
[ View ]
[ Generate Course ]
[ Edit ]
[ Delete ]
```
 
Allow:
 
* View
* Rename
* Edit
* Delete
* Reprocess
* Generate course
 
---
 
# 24. SYLLABUS VERSIONING
 
Do not destroy older syllabus data.
 
Support versions or separate syllabus records.
 
Example:
 
```text
2026–2027 Curriculum
24 Subjects
 
2025–2026 Curriculum
22 Subjects
```
 
Existing courses should maintain a relationship to the syllabus version from which they were generated.
 
---
 
# 25. YEAR SELECTION
 
Support:
 
* Year 1
* Year 2
* Year 3
* Year 4
 
Do not hardcode example subjects.
 
Actual subjects must come from the stored syllabus.
 
---
 
# 26. SEMESTER SELECTION
 
Support:
 
* 1st Semester
* 2nd Semester
* Summer
 
The subject list must dynamically update according to the selected year and semester.
 
---
 
# 27. MULTIPLE SUBJECT SELECTION
 
Users must be able to select multiple subjects.
 
Example:
 
```text
Subjects
 
☑ Data Structures
☑ Network 1
☐ Object-Oriented Programming
☐ Web Development
```
 
Provide:
 
* Search
* Select all
* Deselect all
* Clear selection
* Selection count
 
Example:
 
```text
3 Subjects Selected
 
✓ DSA
✓ Network 1
✓ OOP
```
 
---
 
# 28. COURSE GENERATION
 
After selecting subjects, display generation settings.
 
Example:
 
```text
Generate Course
 
Selected Subjects
 
✓ DSA
✓ Network 1
✓ OOP
 
Generation Method
 
○ Direct AI Generation
● External AI Prompt + JSON
 
Course Depth
 
○ Concise
● Standard
○ Detailed
 
Include
 
☑ Modules
☑ Markdown Lessons
☑ Learning Objectives
☑ Module Quizzes
 
[ Generate ]
```
 
---
 
# 29. DIRECT AI COURSE GENERATION
 
AI must be optional.
 
If the user has configured an AI provider/API key, CourseForge can directly generate courses.
 
Generation should:
 
1. Read syllabus information.
2. Read subject information.
3. Understand learning objectives.
4. Create logical modules.
5. Generate Markdown lessons.
6. Generate module quizzes.
7. Validate the course.
8. Save it.
 
Do NOT simply send a generic prompt such as:
 
```text
Create a course about Data Structures.
```
 
Generation should be grounded in the actual syllabus.
 
---
 
# 30. EXTERNAL AI COURSE GENERATION
 
Users should be able to use CourseForge without an AI API key.
 
CourseForge should generate a complete prompt that can be copied into another AI.
 
The generated prompt should contain:
 
* Subject
* Subject code
* Academic year
* Semester
* Syllabus information
* Learning objectives
* Course requirements
* Module requirements
* Markdown requirements
* Quiz requirements
* JSON schema
* Validation requirements
 
Provide:
 
```text
[ Copy Prompt ]
[ Download JSON Schema ]
```
 
The external AI should return structured JSON.
 
The user then imports the JSON into CourseForge.
 
---
 
# 31. COURSE JSON SCHEMA
 
Create a strict versioned JSON schema.
 
Example:
 
```json
{
  "schema_version": "1.0",
  "course": {
    "title": "Data Structures and Algorithms",
    "subject_code": "CSXXX",
    "year": 2,
    "semester": "1st Semester",
    "description": "...",
    "learning_objectives": [],
    "modules": [
      {
        "id": "module-1",
        "title": "Introduction",
        "description": "...",
        "learning_objectives": [],
        "content_markdown": "# Introduction\n\n...",
        "quiz": {
          "title": "Module 1 Quiz",
          "questions": []
        }
      }
    ]
  }
}
```
 
Design the final schema properly.
 
Validate all imported JSON.
 
Malformed or incomplete JSON must result in useful validation errors.
 
---
 
# 32. MARKDOWN-FIRST CONTENT
 
Educational content MUST be stored as Markdown.
 
Example:
 
```markdown
# Introduction to Arrays
 
Arrays are fundamental data structures...
 
## Learning Objectives
 
By the end of this module, you should be able to:
 
- Explain arrays
- Describe indexing
- Identify common operations
 
## Example
 
[10, 20, 30, 40]
 
## Summary
 
Arrays provide...
```
 
Render Markdown beautifully.
 
Support:
 
* Headings
* Paragraphs
* Lists
* Tables
* Code blocks
* Inline code
* Blockquotes
* Links
* Mathematical notation where appropriate
 
Sanitize rendered content.
 
Never execute arbitrary HTML or JavaScript.
 
---
 
# 33. MODULE STRUCTURE
 
Courses should consist of meaningful modules.
 
Example:
 
```text
Data Structures and Algorithms
 
Module 1
Introduction
 
Module 2
Arrays
 
Module 3
Linked Lists
 
Module 4
Stacks
 
Module 5
Queues
 
Module 6
Trees
```
 
Avoid excessive meaningless module splitting.
 
---
 
# 34. MODULE QUIZZES
 
Every module MUST have a small quiz.
 
Supported:
 
* Multiple choice
* Multiple select
* True/false
* Identification
 
After submission:
 
* Show score
* Show correct/incorrect state
* Show correct answer
* Show explanation
 
Questions must be based on the actual module content.
 
---
 
# 35. COURSE VIEWER
 
Create a proper learning experience.
 
Example:
 
```text
Data Structures and Algorithms
 
Course Progress
████████░░ 80%
 
Modules
 
✓ Introduction
✓ Arrays
✓ Linked Lists
→ Stacks
○ Queues
○ Trees
 
────────────────────────
 
4. Stacks
 
[ Markdown Lesson ]
 
────────────────────────
 
Module Quiz
 
[ Start Quiz ]
```
 
Prioritize:
 
* Readability
* Typography
* Navigation
* Progress
* Mobile responsiveness
* Accessibility
 
---
 
# 36. MULTI-SUBJECT GENERATION
 
If the user selects:
 
```text
DSA
Network 1
OOP
```
 
create three independent courses.
 
Do not merge them into one large course.
 
Each course maintains its own:
 
* Modules
* Lessons
* Quizzes
* Progress
* Metadata
* Syllabus relationship
* Sharing configuration
 
---
 
# 37. AI SETTINGS
 
Create an AI configuration page.
 
Example:
 
```text
AI Configuration
 
Provider
[ Select Provider ]
 
API Key
[ ••••••••••• ]
 
Model
[ Select Model ]
 
[ Test Connection ]
 
[ Save ]
```
 
The architecture must be provider-agnostic.
 
Additional AI providers should be addable later without rewriting the application.
 
---
 
# 38. API KEY SECURITY
 
This is CRITICAL.
 
User-provided API keys MUST NOT be stored as plain text.
 
Encrypt API keys before persistence.
 
Requirements:
 
* Encryption keys must be server-side.
* Decryption must happen server-side only.
* Never expose decrypted keys to frontend code.
* Never store keys in localStorage.
* Never log API keys.
* Never send keys to analytics.
* Never include keys in error messages.
* Never commit keys to Git.
* Never return decrypted keys through API responses.
 
Frontend should display only:
 
```text
API Key
••••••••••••••••
 
Status
✓ Configured
```
 
Provide secure replacement/removal functionality.
 
---
 
# 39. PERFORMANCE
 
CourseForge should feel fast.
 
Use appropriate:
 
* Caching
* Lazy loading
* Efficient queries
* Background processing
* Streaming where appropriate
* Optimized PDF processing
* Optimized Markdown rendering
* Skeleton loaders
 
Long operations must show meaningful progress.
 
Example:
 
```text
Generating Course...
 
✓ Reading syllabus
✓ Understanding subject
✓ Designing modules
→ Generating lessons
○ Generating quizzes
○ Validating course
```
 
Never leave unexplained loading spinners.
 
---
 
# 40. DATABASE ARCHITECTURE
 
Use a proper relational data model.
 
Potential entities:
 
```text
User
Syllabus
SyllabusVersion
Subject
Course
CourseModule
Quiz
QuizQuestion
CourseProgress
AIProviderConfiguration
CourseShare
CoursePermission
CourseInvitation
```
 
Adapt this to the project's actual stack.
 
Do not overengineer.
 
Courses should reference:
 
* Owner
* Subject
* Syllabus
* Syllabus version
 
---
 
# 41. COURSE LIBRARY
 
Create:
 
```text
My Courses
```
 
Example:
 
```text
Data Structures and Algorithms
8 Modules
80% Complete
 
Network 1
6 Modules
20% Complete
 
Object-Oriented Programming
10 Modules
Not Started
```
 
Allow:
 
* Open
* Continue
* Regenerate
* Export
* Share
* Delete
 
---
 
# 42. COURSE REGENERATION
 
Allow course regeneration.
 
Example:
 
```text
Regenerate DSA
 
Source
Current Syllabus
 
Depth
 
○ Concise
● Standard
○ Detailed
 
Focus
 
● Full Syllabus
○ Specific Topics
○ Exam Preparation
 
[ Generate New Version ]
```
 
Do not automatically destroy the old version.
 
---
 
# 43. IMPORT / EXPORT
 
Support:
 
* JSON import
* JSON export
* Markdown export
* Course download
 
JSON schemas must be versioned.
 
Example:
 
```json
{
  "schema_version": "1.0"
}
```
 
Validate all imported data.
 
---
 
# 44. COURSE SHARING
 
CourseForge MUST allow users to share their own courses.
 
There are TWO primary sharing modes:
 
### 1. Anyone With the Link
 
Anyone who has the share link can view the course.
 
### 2. Private
 
Only explicitly authorized users can view the course.
 
The course owner controls the sharing mode.
 
---
 
# 45. PUBLIC LINK SHARING
 
When the owner chooses:
 
**Anyone with the link**
 
generate a secure, non-guessable URL.
 
Example:
 
```text
courseforge.app/share/8fKx92LmQp
```
 
Do NOT use predictable IDs such as:
 
```text
courseforge.app/course/123
```
 
Use cryptographically secure random share tokens.
 
Public shared courses should be VIEW-ONLY by default.
 
Public visitors must NOT be able to:
 
* Edit the original course
* Edit modules
* Edit Markdown
* Edit quizzes
* Regenerate
* Delete
* Change sharing settings
 
Never expose:
 
* API keys
* Private owner information
* Internal secrets
* Sensitive data
 
---
 
# 46. PRIVATE COURSE SHARING
 
The owner should be able to specify exactly who can access a private course.
 
Example:
 
```text
Share Course
 
Visibility
 
○ Anyone with the link
● Private
 
People With Access
 
john@example.com    Viewer
maria@example.com   Viewer
 
[ Add Person ]
 
Permission
 
● Can View
○ Can Edit
```
 
For the initial implementation, prioritize:
 
**Private + View Only**
 
Design the architecture so advanced permissions can be introduced later.
 
---
 
# 47. PRIVATE COURSE ACCESS
 
Private courses MUST NOT be accessible simply by knowing the URL.
 
The server must verify authorization.
 
Flow:
 
```text
Is user authenticated?
        ↓
Does user have permission?
        ↓
YES → Show Course
NO  → Access Denied
```
 
Example:
 
```text
This course is private.
 
Sign in with an authorized account to continue.
 
[ Sign In ]
```
 
Unauthorized:
 
```text
Access Restricted
 
You don't have permission to view this course.
 
Ask the course owner to invite you.
```
 
Authorization must be enforced server-side.
 
---
 
# 48. COURSE OWNER SHARING CONTROLS
 
Provide a polished share dialog.
 
Example:
 
```text
Share "Data Structures and Algorithms"
 
Visibility
 
● Anyone with the link
○ Private
 
────────────────────────
 
Public Link
 
courseforge.app/share/8fKx92LmQp
 
[ Copy Link ]
[ Disable Link ]
 
────────────────────────
 
People With Access
 
john@example.com       Viewer
maria@example.com      Viewer
 
[ Add People ]
 
────────────────────────
 
[ Done ]
```
 
Owner controls:
 
* Enable sharing
* Disable sharing
* Copy link
* Public → Private
* Private → Public
* Add users
* Remove users
* View access list
* Revoke access
 
---
 
# 49. PUBLIC LINK REVOCATION
 
If public sharing is disabled, the public link must stop working.
 
Example:
 
```text
Public Sharing Disabled
 
This course is no longer publicly accessible.
 
[ Enable Sharing ]
```
 
Do not assume share links remain valid forever.
 
---
 
# 50. PRIVATE INVITATIONS
 
Allow owners to invite users by email.
 
Example:
 
```text
Invite Someone
 
Email
[ person@example.com ]
 
Permission
● Viewer
 
[ Send Invitation ]
```
 
Use secure invitation flows if email functionality is implemented.
 
Do not expose private course information directly in URLs.
 
---
 
# 51. SHARED COURSE VIEWER
 
Shared courses should use the same high-quality course viewer.
 
Clearly indicate:
 
```text
Data Structures and Algorithms
 
Shared Course
 
Shared by:
Course Owner
 
8 Modules
8 Quizzes
 
[ Start Learning ]
[ Add to My Courses ]
```
 
The shared viewer must not show owner-only controls.
 
---
 
# 52. OWNER VS VIEWER PERMISSIONS
 
## OWNER
 
Can:
 
* Edit course
* Regenerate
* Delete
* Share
* Change visibility
* Manage permissions
* Edit modules
* Edit Markdown
* Edit quizzes
 
## VIEWER
 
Can:
 
* View
* Read lessons
* Take quizzes
* Track personal progress
* Add course to their own courses
 
Cannot:
 
* Edit original
* Delete original
* Regenerate original
* Modify modules
* Modify quizzes
* Change visibility
* Manage permissions
* Access owner API settings
 
---
 
# 53. ADD TO MY COURSES
 
This is an important feature of public course sharing.
 
A user who accesses a course through:
 
**Anyone with the link**
 
should have the option:
 
**Add to My Courses**
 
Use the user-facing term:
 
**Add to My Courses**
 
Internally, refer to the resulting resource as a:
 
**Course Copy**
 
or:
 
**Shared Course Import**
 
Prefer **Course Copy** internally.
 
---
 
# 54. ADD TO MY COURSES — BEHAVIOR
 
Example:
 
```text
Data Structures and Algorithms
 
Shared Course
 
8 Modules
8 Quizzes
 
[ Start Learning ]
 
[ Add to My Courses ]
```
 
When clicked:
 
### If authenticated:
 
Create an independent copy of the course in the user's Course Library.
 
Then show:
 
```text
✓ Added to My Courses
 
This course is now available in your CourseForge library.
 
[ Go to My Courses ]
[ Continue Learning ]
```
 
---
 
# 55. AUTHENTICATION REQUIRED FOR ADDING
 
Viewing a public shared course does NOT require an account.
 
However, adding it to the user's own courses DOES require an account.
 
If an unauthenticated user clicks:
 
**Add to My Courses**
 
redirect them to Login/Signup.
 
Example:
 
```text
Sign in to save this course
 
Create an account or sign in to add this
course to your CourseForge library.
 
[ Sign In ]
[ Create Account ]
```
 
Do not simply reject the request.
 
---
 
# 56. RETURN TO SHARED COURSE AFTER LOGIN
 
Preserve the original shared-course destination.
 
Example:
 
```text
/shared/8fKx92LmQp
```
 
Flow:
 
```text
User opens shared course
        ↓
Clicks Add to My Courses
        ↓
Is user logged in?
      /       \
    YES        NO
     ↓          ↓
Create Copy   Login/Signup
                 ↓
          Authentication
                 ↓
       Return to Shared Course
                 ↓
          Create Course Copy
                 ↓
               Done
```
 
The user should never have to find the shared link again.
 
If appropriate, automatically complete the add operation after authentication.
 
---
 
# 57. COURSE COPY BEHAVIOR
 
When a user adds a shared course, create an independent course.
 
Example:
 
```text
Original Course
 
Owner: User A
Course: Data Structures
Progress: 80%
 
        ↓
 
User B clicks
"Add to My Courses"
 
        ↓
 
User B's Course Copy
 
Owner: User B
Course: Data Structures
Progress: 0%
```
 
The copied course must have its own:
 
* Course ID
* Owner
* Progress
* Module completion
* Quiz results
* Learning state
* Course library entry
 
---
 
# 58. ORIGINAL COURSE MUST REMAIN UNTOUCHED
 
Creating a Course Copy must NEVER modify the original.
 
The new owner must not accidentally modify:
 
* Original Markdown
* Original modules
* Original quizzes
* Original title
* Original sharing settings
* Original owner
 
Changes to the copied course belong only to the new owner.
 
---
 
# 59. COPY METADATA
 
Store useful source information.
 
Example:
 
```text
Course
 
Title:
Data Structures and Algorithms
 
Source:
Shared Course
 
Original Course:
<internal reference>
 
Original Creator:
<safe public attribution>
 
Copied At:
<timestamp>
```
 
Do not expose unnecessary private information.
 
---
 
# 60. SOURCE INDICATOR
 
A copied course may display:
 
```text
Data Structures and Algorithms
 
Added from a shared course
 
Original creator:
Course Owner
```
 
This helps distinguish copied courses from courses generated directly by the user.
 
---
 
# 61. DUPLICATE HANDLING
 
If the user already has a copy of the shared course, do not blindly create unlimited duplicates.
 
Example:
 
```text
This course is already in your courses.
 
[ Open Course ]
```
 
Optionally allow:
 
```text
[ Add Another Copy ]
```
 
only if there is a valid reason.
 
---
 
# 62. REVOCATION AFTER COPYING
 
Recommended behavior:
 
Once a user successfully uses:
 
**Add to My Courses**
 
the resulting Course Copy remains available to them even if the original owner later disables public sharing.
 
Reason:
 
**Add to My Courses means creating an independent copy.**
 
Therefore:
 
```text
Public Shared Course
        ↓
Add to My Courses
        ↓
Independent Course Copy
        ↓
Original link later revoked
        ↓
Copy remains in user's library
```
 
The original public link should stop working for new access.
 
Do NOT implement automatic synchronization with the original course unless explicitly required.
 
---
 
# 63. OPTIONAL FUTURE COURSE SYNC
 
Do not implement automatic synchronization between original and copied courses in the initial version.
 
The initial model is:
 
**Add to My Courses = Independent Course Copy**
 
A future feature could support synced copies, but it should not complicate the initial implementation.
 
---
 
# 64. SHARED COURSE PROGRESS
 
Viewer progress must be isolated.
 
Example:
 
```text
Owner
 
DSA
████████░░ 80%
 
Student A
 
DSA
████░░░░░░ 40%
 
Student B
 
DSA
██████░░░░ 60%
```
 
Do not store viewer progress as the owner's progress.
 
The owner should not automatically see private viewer learning activity.
 
---
 
# 65. OPTIONAL MAKE A COPY
 
If appropriate, the shared course can provide:
 
```text
[ Start Learning ]
[ Add to My Courses ]
```
 
"Add to My Courses" is the primary user-facing action.
 
Do not clutter the UI with both "Clone", "Fork", "Copy", and "Import".
 
Use one clear term.
 
---
 
# 66. SHARING DATA MODEL
 
Potential structure:
 
```text
Course
├── id
├── owner_id
├── visibility
│   ├── private
│   └── link
└── share_token
 
CoursePermission
├── course_id
├── user_id
├── permission
└── created_at
 
CourseInvitation
├── course_id
├── email
├── token
├── permission
├── expires_at
└── created_at
```
 
For course copies, consider:
 
```text
Course
├── id
├── owner_id
├── source_course_id
├── source_type
└── ...
```
 
Potential `source_type` values:
 
```text
generated
imported
shared_copy
```
 
Adapt to the project's architecture.
 
Do not overcomplicate the schema.
 
---
 
# 67. SHARING SECURITY
 
Sharing is security-sensitive.
 
Requirements:
 
* Cryptographically secure random share tokens
* Non-predictable URLs
* Server-side authorization
* No API key exposure
* No unnecessary private data exposure
* No sequential share IDs
* Revocation
* Permission checks on every protected request
* Sanitized Markdown
* XSS protection
* Deleted courses become inaccessible
* Disabled links become inaccessible
* Removed users lose access immediately
* Course copies are owned by the copying user
 
Test authorization through direct API requests, not only frontend behavior.
 
---
 
# 68. ADD-TO-MY-COURSES SECURITY
 
Do not allow the client to submit an arbitrary course ID and duplicate it.
 
The server must:
 
1. Validate the share token.
2. Verify that the course is currently shareable.
3. Verify that the user is authenticated.
4. Verify that the course exists.
5. Verify that the user is allowed to copy it.
6. Create the new Course Copy.
7. Assign ownership to the authenticated user.
8. Preserve safe source metadata.
9. Return the new course.
 
Never trust client-provided:
 
* Owner IDs
* Course ownership
* Permissions
* Source course IDs
 
---
 
# 69. SHARING UI
 
Use a proper modal/dialog.
 
Example:
 
```text
┌─────────────────────────────────────┐
│ Share Course                    ×   │
│                                     │
│ Choose who can access this course.  │
│                                     │
│ ○ Anyone with the link              │
│   Anyone with the link can view it. │
│                                     │
│ ○ Private                            │
│   Only invited people can view it.  │
│                                     │
│ [ Cancel ]              [ Save ]    │
└─────────────────────────────────────┘
```
 
Do not use browser prompts.
 
---
 
# 70. SHARE BUTTON STATES
 
Unauthenticated:
 
```text
[ Add to My Courses ]
```
 
Authenticated and not added:
 
```text
[ Add to My Courses ]
```
 
Adding:
 
```text
[ Adding... ]
```
 
Success:
 
```text
✓ Added to My Courses
```
 
Already added:
 
```text
✓ In My Courses
```
 
Optional:
 
```text
[ Open Course ]
```
 
---
 
# 71. UI/UX — SUPER GOOD
 
UI quality is one of the highest priorities.
 
CourseForge should feel like a polished commercial educational product.
 
Use:
 
* Excellent typography
* Strong visual hierarchy
* Consistent spacing
* Beautiful cards
* Clear forms
* Dialogs
* Tabs
* Progress indicators
* Toasts
* Skeleton loaders
* Empty states
* Error states
* Responsive layouts
* Subtle animations
 
Avoid:
 
* Generic admin-dashboard appearance
* Excessive gradients
* Excessive glassmorphism
* Unnecessary animations
* Tiny text
* Clutter
* Overly decorative interfaces
 
Do not sacrifice usability for visual effects.
 
---
 
# 72. RESPONSIVE DESIGN
 
CourseForge must work properly on:
 
* Desktop
* Laptop
* Tablet
* Mobile
 
Do not merely shrink desktop layouts.
 
Design mobile layouts intentionally.
 
The course reader must be especially good on mobile.
 
---
 
# 73. ACCESSIBILITY
 
Implement:
 
* Keyboard navigation
* Visible focus states
* Semantic HTML
* Accessible labels
* Proper buttons
* Good contrast
* Screen-reader support
 
---
 
# 74. EMPTY STATES
 
Every important page needs a useful empty state.
 
Example:
 
```text
No Syllabus Yet
 
Upload your university syllabus to automatically organize
your subjects by year and semester.
 
[ Upload Syllabus ]
```
 
Example:
 
```text
No Courses Yet
 
Choose a subject and generate your first learning course.
 
[ Generate Course ]
```
 
---
 
# 75. ERROR HANDLING
 
Handle:
 
* Invalid PDF
* Corrupted PDF
* No subjects detected
* AI API failure
* Invalid API key
* AI timeout
* Invalid JSON
* Missing course fields
* Database failure
* Network failure
* Unauthorized access
* Expired invitation
* Revoked share link
* Invalid share token
 
Never show raw stack traces to users.
 
Provide:
 
* Clear explanation
* Retry action
* Recovery action where possible
 
---
 
# 76. FILE STRUCTURE
 
Create a clean scalable architecture.
 
Separate:
 
* UI components
* Pages/routes
* Services
* Database
* Authentication
* AI
* PDF processing
* Course generation
* Markdown rendering
* Sharing
* Validation
* Security
* Types
* Utilities
 
Do not put the entire application in a few giant files.
 
Follow the existing framework's conventions.
 
---
 
# 77. PERFORMANCE ARCHITECTURE
 
Use:
 
* Efficient queries
* Database indexes
* Caching
* Lazy loading
* Background processing where appropriate
* Streaming where useful
* Optimized PDF processing
* Optimized Markdown rendering
 
Do not overengineer.
 
Choose the simplest architecture that can scale reasonably.
 
---
 
# 78. DASHBOARD NAVIGATION
 
Recommended navigation:
 
```text
CourseForge
 
Dashboard
 
My Syllabi
├── Current
└── Archived
 
Courses
├── My Courses
├── Shared With Me
└── Recently Generated
 
Generate
 
Settings
├── Account
├── AI Configuration
└── Preferences
```
 
Adapt this to the actual UX.
 
---
 
# 79. GENERATION EXPERIENCE
 
Generation should communicate meaningful progress.
 
Example:
 
```text
Preparing Data Structures
 
✓ Reading syllabus
✓ Understanding subject
✓ Designing modules
→ Writing lessons
○ Creating quizzes
○ Validating course
```
 
After completion:
 
```text
Course Ready
 
Data Structures and Algorithms
 
8 Modules
8 Quizzes
 
[ Start Learning ]
```
 
---
 
# 80. AI GENERATION QUALITY
 
Generated courses must not feel like generic AI summaries.
 
Prioritize:
 
1. Syllabus alignment
2. Learning objectives
3. Logical progression
4. Meaningful modules
5. Useful explanations
6. Examples
7. Practical applications
8. Summaries
9. Quizzes
10. Quiz explanations
 
For technical subjects, support:
 
* Code examples
* Algorithms
* Step-by-step explanations
* Practical examples
* Technical diagrams where useful
* Exercises
 
Do not invent syllabus requirements.
 
---
 
# 81. SECURITY
 
Treat ALL user-provided content as untrusted.
 
Validate:
 
* Uploaded files
* JSON
* AI responses
* Markdown
* User input
* Share tokens
* Invitations
 
Protect against:
 
* Unauthorized access
* Data leakage
* Prompt injection from syllabus documents
* Malicious JSON
* API key exposure
* XSS
* Unsafe links
* Unauthorized course editing
* Course enumeration
* Share-token guessing
 
Never execute arbitrary JavaScript from course content.
 
---
 
# 82. FILE STORAGE
 
Store the original syllabus PDF.
 
Do not only store extracted text.
 
The original PDF should remain available for:
 
* Reprocessing
* Regeneration
* Auditing
* Future functionality
 
---
 
# 83. NAVIGATION / INFORMATION ARCHITECTURE
 
Recommended:
 
```text
Dashboard
│
├── My Syllabi
│   ├── Current Syllabus
│   └── Archived Syllabi
│
├── My Courses
│   ├── Generated Courses
│   └── Added Courses
│
├── Shared With Me
│
├── Generate Course
│
└── Settings
    ├── Account
    ├── AI Configuration
    └── Preferences
```
 
Keep navigation understandable.
 
---
 
# 84. COURSE SOURCES
 
Courses may originate from:
 
```text
Generated From Syllabus
Imported From JSON
Added From Shared Course
```
 
Track source information where useful.
 
The UI may display:
 
```text
Source
Shared Course
```
 
or:
 
```text
Source
Generated from 2026–2027 Syllabus
```
 
---
 
# 85. COURSE OWNERSHIP
 
Every course must have a clear owner.
 
Ownership controls:
 
* Editing
* Deleting
* Regeneration
* Sharing
* Visibility
* Permissions
 
A shared viewer is NOT the owner.
 
A Course Copy belongs to the user who created the copy.
 
---
 
# 86. COURSE DATA ISOLATION
 
Users must not be able to access another user's private courses by modifying:
 
* URL
* Course ID
* API request
* Share token
* Client state
 
Enforce authorization server-side.
 
---
 
# 87. MILESTONES
 
Create and maintain these milestones.
 
## Milestone 1 — Foundation
 
Implement:
 
* Project setup
* Architecture
* Design system
* Routing
* Database foundation
* Authentication foundation
* `.context`
 
---
 
## Milestone 2 — Syllabus Management
 
Implement:
 
* PDF upload
* File validation
* PDF extraction
* Syllabus storage
* Subject extraction
* Academic year detection
* Semester detection
* Review/editing
* Syllabus library
* Versioning where appropriate
 
---
 
## Milestone 3 — Academic Organization
 
Implement:
 
* Year selector
* Semester selector
* Subject selector
* Multi-select
* Search
* Filtering
* Dashboard
 
---
 
## Milestone 4 — Course Data Model
 
Implement:
 
* Course schema
* Module schema
* Quiz schema
* Markdown support
* JSON validation
* Import/export
 
---
 
## Milestone 5 — External AI Workflow
 
Implement:
 
* Prompt generator
* JSON schema
* Prompt copying
* JSON schema download
* JSON import
* Validation
* Error handling
 
---
 
## Milestone 6 — Direct AI Generation
 
Implement:
 
* AI provider architecture
* AI configuration
* Secure API-key encryption
* Course generation
* Progress UI
* AI validation
* Error handling
 
---
 
## Milestone 7 — Learning Experience
 
Implement:
 
* Course viewer
* Module navigation
* Markdown renderer
* Progress tracking
* Module quizzes
* Quiz explanations
* Completion tracking
 
---
 
## Milestone 8 — Course Management
 
Implement:
 
* Course library
* Search
* Filtering
* Regeneration
* Versioning
* Delete
* Export
* Course source metadata
 
---
 
## Milestone 9 — Course Sharing
 
Implement:
 
* Anyone-with-link sharing
* Private sharing
* Secure share tokens
* Share dialog
* Visibility controls
* Private invitations
* Permissions
* Server-side authorization
* Public link revocation
* Shared course viewer
* Owner/viewer separation
* Viewer progress isolation
* Add to My Courses
* Independent Course Copies
* Authentication requirement
* Login/signup redirect
* Return-to-shared-course flow
* Duplicate handling
* Copy metadata
* Sharing security
 
---
 
## Milestone 10 — Performance & UX
 
Implement:
 
* Performance optimization
* Caching
* Skeleton loaders
* Responsive improvements
* Accessibility
* Animation polish
* Error states
* Empty states
 
---
 
## Milestone 11 — Production Readiness
 
Implement:
 
* Security audit
* Authentication audit
* API-key audit
* Sharing security audit
* Database audit
* Edge cases
* Testing
* Deployment preparation
* Documentation
 
---
 
# 88. MILESTONE COMPLETION RULE
 
A milestone is NOT complete merely because the UI exists.
 
A milestone is complete only when:
 
* The feature works end-to-end.
* Data persists correctly.
* Loading states exist.
* Errors are handled.
* Responsive behavior works.
* Security is addressed.
* Existing features still work.
* Context documentation is updated.
* Relevant tests/validation exist.
 
---
 
# 89. MILESTONE RECOVERY RULE
 
If you discover that a later milestone was started while an earlier milestone remains substantially incomplete:
 
1. Stop advancing blindly.
2. Identify the incomplete earlier milestone.
3. Determine what is missing.
4. Complete the important missing work.
5. Test it.
6. Update `.context`.
7. Continue forward.
 
Always prioritize the actual repository state.
 
---
 
# 90. CONTEXT MAINTENANCE RULE
 
After meaningful implementation changes:
 
Update:
 
```text
.context/MILESTONES.md
```
 
and any relevant:
 
```text
.context/ARCHITECTURE.md
.context/DATABASE.md
.context/UI_UX.md
.context/AI_GENERATION.md
.context/SYLLABUS_PROCESSING.md
.context/COURSE_SCHEMA.md
.context/SHARING.md
.context/SECURITY.md
.context/PROJECT.md
.context/DECISIONS.md
```
 
Do not allow `.context` to become stale.
 
The `.context` directory is the long-term memory of the project.
 
---
 
# 91. TESTING
 
Test the application progressively.
 
## Authentication
 
Test:
 
* Login
* Logout
* Protected routes
* User isolation
 
## Syllabus
 
Test:
 
* Valid PDF
* Invalid PDF
* Corrupt PDF
* Extraction failures
* Subject editing
* Storage
* Versioning
 
## Course
 
Test:
 
* Generation
* JSON validation
* Markdown rendering
* Quiz functionality
* Progress tracking
* Export/import
 
## Sharing
 
Test:
 
* Public link
* Public viewer
* Public link revocation
* Private sharing
* Unauthorized access
* Authorized access
* Invitation
* Permission removal
* Invalid share token
* Deleted course
* Viewer cannot edit original
* Viewer can add public course to My Courses
 
## Add to My Courses
 
Test:
 
* Authenticated user can add
* Unauthenticated user is redirected to login/signup
* Original URL is preserved
* User returns to shared course after authentication
* Copy is created correctly
* Copy belongs to authenticated user
* Copy has independent progress
* Original course is unchanged
* Duplicate handling works
 
## Security
 
Test direct API requests.
 
Do not rely solely on frontend restrictions.
 
---
 
# 92. FINAL PRODUCT EXPERIENCE
 
The final product should communicate:
 
> Upload your syllabus once. Choose your year, semester, and subjects. CourseForge turns them into structured courses you can actually learn from, manage, and share.
 
A user should be able to:
 
1. Create an account.
2. Upload a syllabus PDF.
3. Let CourseForge extract subjects.
4. Review the extracted information.
5. Select a year.
6. Select a semester.
7. Select one or multiple subjects.
8. Generate courses with AI OR use an external AI.
9. Import generated JSON.
10. Read Markdown lessons.
11. Take module quizzes.
12. Track progress.
13. Manage courses.
14. Export courses.
15. Share courses publicly.
16. Share courses privately.
17. Open someone else's public course.
18. Add that course to their own CourseForge library.
19. If not logged in, authenticate first.
20. Continue from the shared course after authentication.
21. Learn from their own independent Course Copy.
 
---
 
# 93. PRODUCT TERMINOLOGY
 
Use these terms consistently.
 
### Main product
 
**CourseForge**
 
### Public sharing
 
**Anyone with the link**
 
### Private sharing
 
**Private**
 
### Saving another user's shared course
 
**Add to My Courses**
 
### Internal resulting resource
 
**Course Copy**
 
### User's collection
 
**My Courses**
 
Avoid confusing terminology such as:
 
* Clone
* Fork
* Duplicate Import
* External Course
* Saved Object
 
Keep the language student-friendly.
 
---
 
# 94. FINAL CLAUDE BEHAVIOR
 
You are not simply generating code.
 
You are maintaining and progressively developing a real software project.
 
Think like a senior engineer taking over an existing codebase.
 
Before changing anything:
 
**Understand.**
 
Before rebuilding anything:
 
**Verify.**
 
Before declaring something complete:
 
**Test it.**
 
Before moving to another milestone:
 
**Update the context.**
 
Preserve working functionality.
 
Improve weak implementations.
 
Avoid unnecessary rewrites.
 
Keep architecture clean.
 
Keep the UI polished.
 
Keep security strong.
 
Keep the application fast.
 
Keep `.context` accurate.
 
Do not reset the project.
 
Do not blindly rebuild everything.
 
Always continue from the project's ACTUAL current state.
 
---
 
# 95. START NOW
 
Begin by inspecting the repository.
 
Do NOT immediately implement every feature.
 
First determine:
 
1. What framework is being used?
2. What architecture already exists?
3. What functionality is already implemented?
4. Does `.context` already exist?
5. Which milestones are complete?
6. Which milestone is currently active?
7. Which important functionality is missing?
8. What is the most appropriate next implementation step?
 
Then:
 
* Update/create `.context`.
* Update `MILESTONES.md`.
* Implement the highest-priority incomplete milestone.
* Test it.
* Fix problems.
* Update the context.
* Continue progressively.
 
The ultimate goal is a polished, secure, fast, maintainable application:
 
# CourseForge
 
**Turn Your Syllabus Into a Course.**