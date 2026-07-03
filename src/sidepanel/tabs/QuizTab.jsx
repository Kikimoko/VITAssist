import { useState, useEffect } from "react";
import { generateQuiz } from "../../shared/ai/generateQuiz.js";
import {
    getAllSubjectsFromIndex,
    getFilesForSubject
} from "../../shared/storage/storage.js";

export default function QuizTab() {

    const [quiz, setQuiz] = useState([]);
    const [loading, setLoading] = useState(false);
    const [current, setCurrent] = useState(0);

    const [selected, setSelected] = useState(null);
    const [showAnswer, setShowAnswer] = useState(false);

    const [answers, setAnswers] = useState([]);
    const [finished, setFinished] = useState(false);
    const [filename, setFilename] = useState("");
    const [subjects, setSubjects] = useState([]);
    const [files, setFiles] = useState([]);

    const [selectedSubject, setSelectedSubject] = useState("");
    const [selectedFile, setSelectedFile] = useState("");
    useEffect(() => {
        loadSubjects();
        chrome.storage.local.get(
            "vitassist_active_file",
            result => {

                console.log(result);

                if (result.vitassist_active_file) {

                    setFilename(result.vitassist_active_file);

                }

            }

        );

    }, []);
    async function loadSubjects() {

        const list = await getAllSubjectsFromIndex();

        setSubjects(list);

    }
    async function loadFiles(subject) {

        const list = await getFilesForSubject(subject);

        setFiles(list);

    }
    async function startQuiz() {

        if (!selectedFile) {
    
            alert("Select a lecture first.");
    
            return;
    
        }
    
        setLoading(true);
    
        try {
    
            console.log("Generating:", selectedFile);
    
            const data = await generateQuiz(selectedFile);
    
            setQuiz(data);
    
            setCurrent(0);
    
            setAnswers([]);
    
            setSelected(null);
    
            setFinished(false);
    
            setFilename(selectedFile);
    
        } catch (err) {
    
            console.error(err);
    
        }
    
        setLoading(false);
    
    }
    function nextQuestion() {

        // First click = Check Answer
        if (!showAnswer) {

            const updated = [...answers];

            updated[current] = selected;

            setAnswers(updated);

            setShowAnswer(true);

            return;
        }

        // Second click = Continue
        setShowAnswer(false);

        setSelected(null);

        if (current === quiz.length - 1) {

            setFinished(true);

        } else {

            setCurrent(current + 1);

        }

    }

    if (loading) {

        return (
            <div className="tab-pane">
                <h2>🧠 Generating Quiz...</h2>
            </div>
        );

    }

    if (finished) {

        let score = 0;

        quiz.forEach((q, i) => {

            if (answers[i] === q.answer) {

                score++;

            }

        });

        return (

            <div className="quiz-page">

                <h2>🎉 Quiz Finished</h2>

                <h3>
                    Score: {score} / {quiz.length}
                </h3>

                {quiz.map((q, i) => (

                    <div
                        key={i}
                        className="note-card"
                        style={{ marginBottom: 14 }}
                    >

                        <b>
                            {i + 1}. {q.question}
                        </b>

                        <p>

                            Your Answer:

                            {" "}

                            {q.options[answers[i]]}

                        </p>

                        <p>

                            Correct:

                            {" "}

                            {q.options[q.answer]}

                        </p>

                        <p>

                            💡 {q.explanation}

                        </p>

                    </div>

                ))}

            </div>

        );

    }

    if (quiz.length === 0) {

        return (
    
            <div className="quiz-home">
    
                <div className="quiz-home-header">
    
                    <h1>AI Quiz</h1>
    
                    <p>
                        Generate personalized quizzes from your lecture notes.
                    </p>
    
                </div>
    
                <div className="quiz-home-card">
    
                    <label>Subject</label>
    
                    <select
                        className="quiz-select"
                        value={selectedSubject}
                        onChange={async (e)=>{
    
                            const subject=e.target.value;
    
                            setSelectedSubject(subject);
    
                            setSelectedFile("");
    
                            await loadFiles(subject);
    
                        }}
                    >
    
                        <option value="">
                            Select Subject
                        </option>
    
                        {subjects.map(subject=>(
                            <option
                                key={subject}
                                value={subject}
                            >
                                {subject}
                            </option>
                        ))}
    
                    </select>
    
                    <label>Lecture</label>
    
                    <select
                        className="quiz-select"
                        value={selectedFile}
                        onChange={(e)=>setSelectedFile(e.target.value)}
                    >
    
                        <option value="">
                            Select Lecture
                        </option>
    
                        {files.map(file=>(
                            <option
                                key={file.filename}
                                value={file.filename}
                            >
                                {file.filename
                                    .replace(".pdf","")
                                    .replace(".pptx","")
                                    .replace(".ppt","")}
                            </option>
                        ))}
    
                    </select>
    
                    <button
                        className="quiz-start-btn"
                        disabled={!selectedFile}
                        onClick={startQuiz}
                    >
                        Generate Quiz
                    </button>
    
                </div>
    
            </div>
    
        );
    
    }

    const q = quiz[current];

    return (

        <div className="tab-pane">

            <div className="quiz-header">

                <div className="quiz-subject">

                📄 {selectedFile
    .replace(".pdf","")
    .replace(".pptx","")
    .replace(".ppt","")}

                </div>

                <div className="quiz-count">

                    Question {current + 1} of {quiz.length}

                </div>
                <div className="quiz-progress">

    <div
        className="quiz-progress-fill"
        style={{
            width:`${((current+1)/quiz.length)*100}%`
        }}
    />

</div>

            </div>

            <div className="quiz-question-card">

                <h2>

                    {q.question}

                </h2>

            </div>

            {q.options.map((option, index) => (

                <button

                    key={index}

                    className={
                        "quiz-option " +

                        (

                            showAnswer

                                ? index === q.answer

                                    ? "correct"

                                    : index === selected

                                        ? "wrong"

                                        : ""

                                : index === selected

                                    ? "selected"

                                    : ""

                        )

                    }

                    disabled={showAnswer}

                    onClick={() => setSelected(index)}

                >

                    {option}

                </button>

            ))}
            {showAnswer && (

                <div className="quiz-explanation">

                    <h3>

                        {selected === q.answer
                            ? "✅ Correct!"
                            : "❌ Incorrect"}

                    </h3>

                    <p>

                        {q.explanation}

                    </p>

                </div>

            )}

            <button

                className="quiz-next-btn"

                disabled={selected === null}

                onClick={nextQuestion}

            >

                {showAnswer

                    ? current === quiz.length - 1

                        ? "Finish Quiz"

                        : "Continue"

                    : "Check Answer"}

            </button>

        </div>

    );

}