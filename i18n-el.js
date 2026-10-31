'use strict';
// Greek for StickyPad. Exact English text -> Greek. A text with no entry stays English.
(function () {
  const I = typeof module === 'object' && module.exports ? require('./i18n') : window.StickyI18n;
  const D = {
    /* ---- Home ---- */
    'StickyPad – Home': 'StickyPad – Αρχική', 'Home': 'Αρχική', 'Trash': 'Κάδος', 'AI chat': 'Συνομιλία AI', 'Settings': 'Ρυθμίσεις', 'Notes': 'Σημειώσεις',
    'Hello': 'Γεια σου', 'AI chat (Ctrl+Alt+C)': 'Συνομιλία AI (Ctrl+Alt+C)', 'Settings (Ctrl+Alt+S)': 'Ρυθμίσεις (Ctrl+Alt+S)',
    'Search notes': 'Αναζήτηση σημειώσεων', '＋ Note': '＋ Σημείωση', '＋ New folder': '＋ Νέος φάκελος', 'Tidy up notes': 'Τακτοποίηση σημειώσεων',
    'Arrange open notes in rows, folder by folder': 'Τακτοποιεί τις ανοιχτές σημειώσεις σε σειρές, φάκελο προς φάκελο',
    'Select': 'Επιλογή', 'Select all': 'Επιλογή όλων', 'Cancel': 'Άκυρο', 'Add': 'Προσθήκη', 'Folder name': 'Όνομα φακέλου', 'New folder name': 'Όνομα νέου φακέλου', 'Show folder': 'Εμφάνιση φακέλου',
    'Choose every note shown (Ctrl+A)': 'Επιλογή όλων των σημειώσεων που φαίνονται (Ctrl+A)',
    'Choose several notes to print, move to a folder or move to the trash': 'Διάλεξε πολλές σημειώσεις για εκτύπωση, μεταφορά σε φάκελο ή στον κάδο',
    'Choose several deleted notes to bring back or delete for good': 'Διάλεξε πολλές διαγραμμένες σημειώσεις για επαναφορά ή οριστική διαγραφή',
    'Deleted notes are kept for 30 days, then removed for good.': 'Οι διαγραμμένες σημειώσεις φυλάσσονται 30 ημέρες και μετά διαγράφονται οριστικά.',
    'Empty trash': 'Άδειασμα κάδου', 'Restore': 'Επαναφορά', 'Delete forever': 'Οριστική διαγραφή', 'Sure? Cannot undo': 'Σίγουρα; Δεν αναιρείται', 'Sure?': 'Σίγουρα;', 'Sure? They go to the trash': 'Σίγουρα; Πάνε στον κάδο',
    'Print': 'Εκτύπωση', 'Export': 'Εξαγωγή', 'Colour': 'Χρώμα', 'Folder': 'Φάκελος', 'More': 'Περισσότερα', 'Undo': 'Αναίρεση',
    'Save the chosen notes as .stickypad files in a folder you pick': 'Αποθήκευση των επιλεγμένων σημειώσεων ως αρχεία .stickypad σε φάκελο της επιλογής σου',
    'Actions for the chosen notes': 'Ενέργειες για τις επιλεγμένες σημειώσεις', 'Actions for the chosen deleted notes': 'Ενέργειες για τις επιλεγμένες διαγραμμένες σημειώσεις',
    'Pinned notes': 'Καρφιτσωμένες σημειώσεις', '📌 Pinned': '📌 Καρφιτσωμένες', 'Sort the notes': 'Ταξινόμηση σημειώσεων', 'Sort notes by': 'Ταξινόμηση σημειώσεων κατά',
    'Last edited': 'Τελευταία επεξεργασία', 'A to Z': 'Α έως Ω', 'Z to A': 'Ω έως Α', 'Open first': 'Πρώτα οι ανοιχτές', 'Pinned notes always stay first.': 'Οι καρφιτσωμένες σημειώσεις μένουν πάντα πρώτες.',
    'Open': 'Άνοιγμα', 'Close': 'Κλείσιμο', 'Pin on top': 'Καρφίτσωμα στην κορυφή', 'Unpin': 'Ξεκαρφίτσωμα', 'No folder': 'Χωρίς φάκελο', 'All': 'Όλες',
    'Open all': 'Άνοιγμα όλων', 'Open every note in this folder': 'Ανοίγει όλες τις σημειώσεις αυτού του φακέλου', 'Rename folder': 'Μετονομασία φακέλου', 'Delete folder (its notes are kept)': 'Διαγραφή φακέλου (οι σημειώσεις του μένουν)',
    'Delete?': 'Διαγραφή;', 'Expand': 'Ανάπτυξη', 'Collapse': 'Σύμπτυξη',
    '(empty note)': '(κενή σημείωση)', 'Locked note': 'Κλειδωμένη σημείωση', '📷 Picture note': '📷 Σημείωση με εικόνα', '🔒 locked': '🔒 κλειδωμένη', '📌 pinned': '📌 καρφιτσωμένη', 'rolled up': 'τυλιγμένη', 'closed': 'κλειστή',
    'Note moved to the trash': 'Η σημείωση μεταφέρθηκε στον κάδο', 'No notes yet': 'Καμία σημείωση ακόμη', 'No notes yet. Press “＋ Note”.': 'Καμία σημείωση ακόμη. Πάτα «＋ Σημείωση».',
    'The trash is empty.': 'Ο κάδος είναι άδειος.', 'Nothing deleted': 'Τίποτα διαγραμμένο', 'Deleted': 'Διαγράφηκε', 'No folder ': 'Χωρίς φάκελο',
    'Click notes to choose them (Shift+click for a range, Ctrl+A for all).': 'Κάνε κλικ στις σημειώσεις για να τις επιλέξεις (Shift+κλικ για περιοχή, Ctrl+A για όλες).',
    'Click deleted notes to choose them.': 'Κάνε κλικ στις διαγραμμένες σημειώσεις για να τις επιλέξεις.',
    'Printing did not start.': 'Η εκτύπωση δεν ξεκίνησε.', 'Nothing was changed.': 'Δεν άλλαξε τίποτα.',
    'Remove': 'Αφαίρεση', 'Delete': 'Διαγραφή', 'Rename': 'Μετονομασία', 'Open note': 'Άνοιγμα σημείωσης', 'Copy text': 'Αντιγραφή κειμένου', 'Print…': 'Εκτύπωση…', 'Duplicate': 'Αντίγραφο', 'Move to folder': 'Μετακίνηση σε φάκελο', 'Move to trash': 'Μετακίνηση στον κάδο',
    /* ---- quick search ---- */
    'Search all your notes or run an action': 'Αναζήτηση σε όλες τις σημειώσεις ή εκτέλεση ενέργειας', 'Search notes, or type > for actions': 'Αναζήτηση σημειώσεων ή γράψε > για ενέργειες',
    'Run an action instead of searching (the same as typing >)': 'Εκτέλεση ενέργειας αντί για αναζήτηση (το ίδιο με το να γράψεις >)', 'Matching notes': 'Σημειώσεις που ταιριάζουν', '› Actions': '› Ενέργειες',
    'Enter': 'Enter', 'Esc': 'Esc', 'choose': 'επιλογή', 'close': 'κλείσιμο', 'open': 'άνοιγμα', 'actions': 'ενέργειες',
    /* ---- chat ---- */
    'StickyPad – AI chat': 'StickyPad – Συνομιλία AI', '+ New': '+ Νέα', 'AI model': 'Μοντέλο AI', 'Ask anything…': 'Ρώτα ό,τι θέλεις…', "Ask me anything. Pick a note above and I'll use it as context.": 'Ρώτησέ με ό,τι θέλεις. Διάλεξε μια σημείωση από πάνω και θα τη χρησιμοποιήσω ως πλαίσιο.',
    'Chats': 'Συνομιλίες', 'Delete all chats': 'Διαγραφή όλων των συνομιλιών', 'Enter sends, Shift+Enter adds a new line': 'Το Enter στέλνει, το Shift+Enter αλλάζει γραμμή', 'Message': 'Μήνυμα', 'New chat': 'Νέα συνομιλία', 'No note': 'Καμία σημείωση',
    'Note the AI uses as context': 'Σημείωση που χρησιμοποιεί το AI ως πλαίσιο', 'Search chats': 'Αναζήτηση συνομιλιών', 'Send': 'Αποστολή', 'Show or hide the list of chats': 'Εμφάνιση ή απόκρυψη της λίστας συνομιλιών', 'Start a new chat': 'Έναρξη νέας συνομιλίας',
    'The AI model that answers': 'Το μοντέλο AI που απαντά', 'The note the AI uses as context': 'Η σημείωση που χρησιμοποιεί το AI ως πλαίσιο', 'Your chats': 'Οι συνομιλίες σου', '✨ The AI is off: set it up in Settings': '✨ Το AI είναι απενεργοποιημένο: ρύθμισέ το στις Ρυθμίσεις',
    /* ---- welcome / what's new ---- */
    'Welcome to StickyPad': 'Καλώς ήρθες στο StickyPad', 'Back': 'Πίσω', 'Next': 'Επόμενο', 'Skip': 'Παράλειψη', 'Steps': 'Βήματα',
    "What's new in StickyPad": 'Τι νέο υπάρχει στο StickyPad', "Don't show this after updates": 'Να μην εμφανίζεται μετά από ενημερώσεις', 'Got it': 'Εντάξει', 'Earlier versions': 'Παλαιότερες εκδόσεις', 'Latest': 'Τελευταία',
    /* ---- print window ---- */
    '2 columns': '2 στήλες', '3 columns': '3 στήλες', 'A thin frame around each note': 'Λεπτό πλαίσιο γύρω από κάθε σημείωση', 'Across the page, one after another': 'Σε όλη τη σελίδα, η μία μετά την άλλη',
    'As big as on screen, from the top left corner': 'Όσο μεγάλη είναι στην οθόνη, από την πάνω αριστερή γωνία', 'Boxed': 'Με πλαίσιο', 'Each note starts on a new page': 'Κάθε σημείωση ξεκινά σε νέα σελίδα',
    "Filled with the note's colour (uses more ink)": 'Γεμισμένη με το χρώμα της σημείωσης (χρησιμοποιεί περισσότερο μελάνι)', 'First page of the preview (long notes are shortened here). The Windows print window comes next.': 'Πρώτη σελίδα της προεπισκόπησης (οι μεγάλες σημειώσεις συντομεύονται εδώ). Ακολουθεί το παράθυρο εκτύπωσης των Windows.',
    'Full width': 'Πλήρες πλάτος', 'Include': 'Συμπερίληψη', 'Large': 'Μεγάλο', 'Layout': 'Διάταξη', 'Normal': 'Κανονικό', 'One note per page': 'Μία σημείωση ανά σελίδα', 'Pictures': 'Εικόνες', 'Plain': 'Απλό', 'Preview': 'Προεπισκόπηση', 'Real size': 'Πραγματικό μέγεθος',
    'Side by side, in the order you chose': 'Δίπλα-δίπλα, με τη σειρά που διάλεξες', 'Small': 'Μικρό', 'Smaller notes, three across': 'Μικρότερες σημειώσεις, τρεις σε κάθε σειρά', 'Sticky note': 'Αυτοκόλλητη σημείωση', 'Style': 'Στυλ', 'Text only, black on white': 'Μόνο κείμενο, μαύρο σε λευκό', 'Text size': 'Μέγεθος κειμένου', 'Titles': 'Τίτλοι',
    /* ---- a note ---- */
    'StickyPad': 'StickyPad', 'Drag to move': 'Σύρε για μετακίνηση', 'Topic': 'Θέμα', 'Title': 'Τίτλος', 'Note settings': 'Ρυθμίσεις σημείωσης',
    'Home: your notes, AI chat, settings (Ctrl+Alt+Q)': 'Αρχική: οι σημειώσεις σου, η συνομιλία AI, οι ρυθμίσεις (Ctrl+Alt+Q)', 'Add checklist item': 'Προσθήκη στοιχείου λίστας', 'Add checklist item (Ctrl+Shift+C)': 'Προσθήκη στοιχείου λίστας (Ctrl+Shift+C)',
    'Keep on top': 'Πάντα μπροστά', 'Lock note now': 'Κλείδωμα σημείωσης τώρα', 'Lock now': 'Κλείδωμα τώρα', 'This note: colours, reminder, lock, AI': 'Αυτή η σημείωση: χρώματα, υπενθύμιση, κλείδωμα, AI', 'This note': 'Αυτή η σημείωση',
    'Roll up': 'Τύλιγμα', 'Roll down': 'Ξετύλιγμα', 'Close (reopen from the tray icon)': 'Κλείσιμο (άνοιξέ την ξανά από το εικονίδιο της γραμμής εργασιών)', 'Look': 'Εμφάνιση', 'Colours': 'Χρώματα', 'Palettes': 'Παλέτες', 'Note colour': 'Χρώμα σημείωσης', 'Custom colour': 'Προσαρμοσμένο χρώμα',
    'Switch the set of colours, or make your own': 'Άλλαξε το σετ χρωμάτων ή φτιάξε το δικό σου', 'Font and transparency': 'Γραμματοσειρά και διαφάνεια', 'Font': 'Γραμματοσειρά', 'Font size': 'Μέγεθος γραμματοσειράς', 'Transparency': 'Διαφάνεια', 'Keep the text solid': 'Το κείμενο να μένει ολόκληρο',
    'Make plain text': 'Μετατροπή σε απλό κείμενο', 'Turn every checklist item back into a normal line of text': 'Μετατρέπει κάθε στοιχείο της λίστας ξανά σε κανονική γραμμή κειμένου', 'Remove ticked': 'Αφαίρεση τσεκαρισμένων',
    'Reminder': 'Υπενθύμιση', 'Remind me': 'Υπενθύμισέ μου', 'Remind me at': 'Υπενθύμισέ μου στις', 'Quick reminders': 'Γρήγορες υπενθυμίσεις', '10 min': '10 λεπτά', '1 hour': '1 ώρα', '3 hours': '3 ώρες', 'Tomorrow 9:00': 'Αύριο 9:00', 'Remove the reminder': 'Αφαίρεση υπενθύμισης', 'Clear': 'Εκκαθάριση', 'None': 'Καμία',
    'Lock': 'Κλείδωμα', 'Unlock': 'Ξεκλείδωμα', 'Password': 'Κωδικός', 'New password': 'Νέος κωδικός', 'Password (4+ characters)': 'Κωδικός (4+ χαρακτήρες)', 'Password to remove lock': 'Κωδικός για αφαίρεση κλειδώματος', 'This note is locked': 'Αυτή η σημείωση είναι κλειδωμένη',
    'A forgotten password cannot be recovered. Pictures stay on disk unencrypted (hidden in the app).': 'Ένας ξεχασμένος κωδικός δεν ανακτάται. Οι εικόνες μένουν στον δίσκο χωρίς κρυπτογράφηση (κρυμμένες μέσα στην εφαρμογή).',
    'Version history…': 'Ιστορικό εκδόσεων…', 'See older copies of this note and bring one back': 'Δες παλαιότερα αντίγραφα αυτής της σημείωσης και επανάφερε ένα',
    'Copy or export': 'Αντιγραφή ή εξαγωγή', 'Copy note as text': 'Αντιγραφή σημείωσης ως κείμενο', 'Copy the whole note as plain text (Ctrl+Shift+T)': 'Αντιγραφή ολόκληρης της σημείωσης ως απλό κείμενο (Ctrl+Shift+T)', 'Duplicate note': 'Αντίγραφο σημείωσης', 'Make a copy of this note: same text, pictures, colour and folder': 'Δημιουργία αντιγράφου: ίδιο κείμενο, εικόνες, χρώμα και φάκελος',
    'Export…': 'Εξαγωγή…', 'Save this note as a Markdown or text file': 'Αποθήκευση της σημείωσης ως αρχείο Markdown ή κειμένου', 'Print this note (Ctrl+P)': 'Εκτύπωση αυτής της σημείωσης (Ctrl+P)', 'Move this note to the trash': 'Μετακίνηση αυτής της σημείωσης στον κάδο',
    'All settings…': 'Όλες οι ρυθμίσεις…', 'Settings for the whole app (Ctrl+,)': 'Ρυθμίσεις για ολόκληρη την εφαρμογή (Ctrl+,)', 'Find in note': 'Εύρεση στη σημείωση', 'Previous match': 'Προηγούμενο', 'Next match': 'Επόμενο', 'Close search': 'Κλείσιμο αναζήτησης',
    'Previous (Shift+Enter)': 'Προηγούμενο (Shift+Enter)', 'Next (Enter)': 'Επόμενο (Enter)', 'Close (Esc)': 'Κλείσιμο (Esc)',
    'Text formatting': 'Μορφοποίηση κειμένου', 'Bold': 'Έντονα', 'Bold (Ctrl+B)': 'Έντονα (Ctrl+B)', 'Italic': 'Πλάγια', 'Italic (Ctrl+I)': 'Πλάγια (Ctrl+I)', 'Underline': 'Υπογράμμιση', 'Underline (Ctrl+U)': 'Υπογράμμιση (Ctrl+U)', 'Strikethrough': 'Διαγράμμιση', 'Strikethrough (Ctrl+Shift+X)': 'Διαγράμμιση (Ctrl+Shift+X)',
    'Highlight': 'Επισήμανση', 'Highlight colours': 'Χρώματα επισήμανσης', 'Letter colour': 'Χρώμα γραμμάτων', 'Clear formatting': 'Καθαρισμός μορφοποίησης', 'No highlight': 'Χωρίς επισήμανση', 'Automatic': 'Αυτόματο',
    'AI': 'AI', 'Chat about this note': 'Συζήτηση για αυτή τη σημείωση', 'Open the AI chat with this note as context': 'Ανοίγει τη συνομιλία AI με αυτή τη σημείωση ως πλαίσιο', 'Summarize': 'Περίληψη', 'Short summary of the selected text, or the whole note': 'Σύντομη περίληψη του επιλεγμένου κειμένου ή ολόκληρης της σημείωσης',
    'Translate': 'Μετάφραση', 'Translate…': 'Μετάφραση…', 'Translate the selected text, or the whole note': 'Μετάφραση του επιλεγμένου κειμένου ή ολόκληρης της σημείωσης', 'Translate into': 'Μετάφραση σε', 'Translate Greek ⇄ English': 'Μετάφραση Ελληνικά ⇄ Αγγλικά', 'From': 'Από', 'To': 'Σε', 'Search languages': 'Αναζήτηση γλωσσών',
    'Greek ⇄ English works best. Small models on your PC are weaker with the other languages.': 'Τα Ελληνικά ⇄ Αγγλικά δουλεύουν καλύτερα. Τα μικρά μοντέλα στον υπολογιστή σου είναι πιο αδύναμα στις άλλες γλώσσες.',
    'Fix spelling and grammar': 'Διόρθωση ορθογραφίας και γραμματικής', 'Fix spelling and grammar (shows each change)': 'Διόρθωση ορθογραφίας και γραμματικής (δείχνει κάθε αλλαγή)', 'Fix grammar': 'Διόρθωση γραμματικής', 'Turn into a checklist': 'Μετατροπή σε λίστα εργασιών', 'To checklist': 'Σε λίστα', 'Suggest a title': 'Πρότεινε τίτλο',
    'Polish the writing': 'Βελτίωση του κειμένου', 'Make it shorter': 'Συντόμευση', 'Make it friendlier': 'Πιο φιλικό ύφος', 'Fix it right in the note': 'Διόρθωση κατευθείαν στη σημείωση', 'Continue writing': 'Συνέχισε το κείμενο', 'More AI actions': 'Περισσότερες ενέργειες AI', 'Run': 'Εκτέλεση', 'Stop': 'Διακοπή', 'Edit live': 'Ζωντανή επεξεργασία', 'Editing…': 'Επεξεργασία…',
    'Run on the selected text, or the whole note (Ctrl+Shift+E edits live)': 'Εκτελείται στο επιλεγμένο κείμενο ή σε ολόκληρη τη σημείωση (το Ctrl+Shift+E κάνει ζωντανή επεξεργασία)', 'AI result': 'Αποτέλεσμα AI', 'Keep': 'Διατήρηση', 'Use': 'Χρήση', 'Save': 'Αποθήκευση', 'Test': 'Δοκιμή',
    'Model and connection': 'Μοντέλο και σύνδεση', 'AI provider': 'Πάροχος AI', 'Model': 'Μοντέλο', 'Model name': 'Όνομα μοντέλου', 'Address': 'Διεύθυνση', 'Address or key': 'Διεύθυνση ή κλειδί', 'Forget key': 'Διαγραφή κλειδιού', 'Ollama (on this PC, free)': 'Ollama (σε αυτό τον υπολογιστή, δωρεάν)', 'Claude API (online)': 'Claude API (στο διαδίκτυο)', 'Off': 'Ανενεργό',
    'The text of the note you ask about is sent to the provider you pick. Ollama keeps it on this PC; the Claude API sends it to Anthropic.': 'Το κείμενο της σημείωσης που ρωτάς στέλνεται στον πάροχο που διαλέγεις. Το Ollama το κρατά σε αυτό τον υπολογιστή· το Claude API το στέλνει στην Anthropic.',
    'Word suggestions': 'Προτάσεις λέξεων', 'How to edit': 'Πώς να επεξεργαστείς', 'Snap to half screen?': 'Κούμπωμα σε μισή οθόνη;', 'Not now': 'Όχι τώρα', 'No thanks': 'Όχι, ευχαριστώ', 'No thanks, do not ask again': 'Όχι, ευχαριστώ, να μην ξαναρωτήσεις', 'Open Settings > Notes': 'Άνοιγμα Ρυθμίσεων > Σημειώσεις',
    /* ---- keyboard shortcuts panel ---- */
    'Keyboard shortcuts': 'Συντομεύσεις πληκτρολογίου', 'In this note': 'Σε αυτή τη σημείωση', 'In Home': 'Στην Αρχική', 'Anywhere in Windows': 'Οπουδήποτε στα Windows', 'Close (Esc) ': 'Κλείσιμο (Esc)',
    'New note': 'Νέα σημείωση', 'Add a checklist item': 'Προσθήκη στοιχείου λίστας', 'Find in the note': 'Εύρεση στη σημείωση', 'Live AI edit': 'Ζωντανή επεξεργασία με AI', 'All settings': 'Όλες οι ρυθμίσεις', 'Paste as plain text': 'Επικόλληση ως απλό κείμενο', 'Redo': 'Επανάληψη', 'Select all ': 'Επιλογή όλων', 'This list': 'Αυτή η λίστα',
    'Choose every note (in Select mode)': 'Επιλογή όλων των σημειώσεων (σε λειτουργία επιλογής)', 'Leave Select mode or close a menu': 'Έξοδος από την επιλογή ή κλείσιμο μενού', 'AI chat ': 'Συνομιλία AI', 'New note from the clipboard': 'Νέα σημείωση από το πρόχειρο', 'Search all notes': 'Αναζήτηση σε όλες τις σημειώσεις',
    /* ---- palettes ---- */
    'Standard': 'Βασική', 'Clear colours': 'Καθαρά χρώματα', 'Colour-blind friendly': 'Για αχρωματοψία', 'Make my own palette…': 'Φτιάξε τη δική μου παλέτα…', 'From the theme': 'Από το θέμα', 'Yellow': 'Κίτρινο', 'Pink': 'Ροζ', 'Blue': 'Μπλε', 'Green': 'Πράσινο', 'Orange': 'Πορτοκαλί', 'Purple': 'Μωβ', 'White': 'Λευκό', 'Graphite': 'Γραφίτης',
    'Pale yellow': 'Ανοιχτό κίτρινο', 'Light pink': 'Ανοιχτό ροζ', 'Lavender': 'Λεβάντα', 'Sky blue': 'Γαλάζιο', 'Bluish green': 'Γαλαζοπράσινο', 'Red': 'Κόκκινο', 'Grey': 'Γκρι', 'Black': 'Μαύρο', 'Brown': 'Καφέ', 'Teal': 'Τιρκουάζ', 'Light grey': 'Ανοιχτό γκρι',
    'Note colours': 'Χρώματα σημειώσεων', 'Name': 'Όνομα', 'Save and use': 'Αποθήκευση και χρήση', 'Letters': 'Γράμματα', 'Auto': 'Αυτόματα', 'Own': 'Δικά μου', 'Edit': 'Επεξεργασία', '— No folder —': '— Χωρίς φάκελο —', 'Cut': 'Αποκοπή', 'Copy': 'Αντιγραφή', 'Paste': 'Επικόλληση', 'No suggestions': 'Καμία πρόταση', 'Add to dictionary': 'Προσθήκη στο λεξικό', 'Quit StickyPad': 'Έξοδος από το StickyPad', 'Show all notes': 'Εμφάνιση όλων των σημειώσεων', 'Hide from taskbar': 'Απόκρυψη από τη γραμμή εργασιών', 'Snap notes to edges and each other': 'Κούμπωμα σημειώσεων σε άκρες και μεταξύ τους', 'Copy e-mail address': 'Αντιγραφή διεύθυνσης e-mail', 'Copy link': 'Αντιγραφή συνδέσμου', 'Write an e-mail': 'Σύνταξη e-mail', 'Open link': 'Άνοιγμα συνδέσμου'
  };
  const n = (x, one, many) => x + ' ' + (+x === 1 ? one : many);
  const R = [
    [/^(\d+) notes? chosen\. Print uses the order of the numbers\.$/, x => n(x, 'σημείωση επιλέχθηκε', 'σημειώσεις επιλέχθηκαν') + '. Η εκτύπωση ακολουθεί τη σειρά των αριθμών.'],
    [/^(\d+) notes? chosen\.$/, x => n(x, 'σημείωση επιλέχθηκε', 'σημειώσεις επιλέχθηκαν') + '.'],
    [/^(\d+) chosen$/, x => +x === 1 ? '1 επιλεγμένη' : x + ' επιλεγμένες'], [/^(\d+) notes?$/, x => n(x, 'σημείωση', 'σημειώσεις')],
    [/^(\d+) of (\d+) notes$/, (a, b) => a + ' από ' + b + ' σημειώσεις'], [/^(\d+) deleted notes?$/, x => n(x, 'διαγραμμένη σημείωση', 'διαγραμμένες σημειώσεις')],
    [/^(\d+) notes? moved to (.+)$/, (x, to) => n(x, 'σημείωση μεταφέρθηκε', 'σημειώσεις μεταφέρθηκαν') + ' σε ' + to], [/^(\d+) notes moved to the trash$/, x => x + ' σημειώσεις μεταφέρθηκαν στον κάδο'],
    [/^(\d+) notes? (recoloured|opened|closed|pinned|unpinned|exported|restored)$/, (x, v) => n(x, 'σημείωση', 'σημειώσεις') + ' ' + ({ recoloured: 'άλλαξαν χρώμα', opened: 'άνοιξαν', closed: 'έκλεισαν', pinned: 'καρφιτσώθηκαν', unpinned: 'ξεκαρφιτσώθηκαν', exported: 'εξήχθησαν', restored: 'επαναφέρθηκαν' })[v]],
    [/^Version (\d[\d.]*)$/, v => 'Έκδοση ' + v], [/^You are now on version (\d[\d.]*)$/, v => 'Τώρα έχεις την έκδοση ' + v],
    [/^Deleted (.+)$/, d => 'Διαγράφηκε ' + d], [/^(.+) \(copy\)$/, x => x + ' (αντίγραφο)'],
    [/^Search notes…\s+\((.+)\)$/, k => 'Αναζήτηση σημειώσεων… (' + k + ')'], [/^Home…\s+\((.+)\)$/, k => 'Αρχική… (' + k + ')'], [/^Settings…\s+\((.+)\)$/, k => 'Ρυθμίσεις… (' + k + ')'], [/^AI chat…\s+\((.+)\)$/, k => 'Συνομιλία AI… (' + k + ')'], [/^New note\s+\((.+)\)$/, k => 'Νέα σημείωση (' + k + ')'],
    [/^Trash \((\d+)\)$/, x => 'Κάδος (' + x + ')'],
    [/^Colour (.+)$/, c => 'Χρώμα ' + c], [/^From the theme \((.+)\)$/, c => 'Από το θέμα (' + c + ')']
  ];
  I.add('el', D, R);
})();
