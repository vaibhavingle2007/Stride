import React, { useState, useRef } from "react";
import { User } from "firebase/auth";
import { Camera, Upload, Pencil, School, Calendar, LayoutDashboard, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { collection, addDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import Header from "../components/Header";
import Navigation from "../components/Navigation";
import { getLocalDateString } from "../lib/productivity";
import { logActivity } from "../lib/activity";

interface SnapAndPlanProps {
  user: User;
  onSignOut: () => void;
}

interface ExtractedTask {
  name: string;
  deadline: string;
  priority: 'high' | 'medium' | 'low';
  description: string;
  confidence: 'high' | 'medium' | 'low';
  raw_text: string;
  selected?: boolean;
}

interface AnalysisResult {
  image_type: string;
  total_items_visible: number;
  tasks: ExtractedTask[];
  unreadable_sections: string | null;
  overall_confidence: 'high' | 'medium' | 'low';
}

export default function SnapAndPlan({ user, onSignOut }: SnapAndPlanProps) {
  const [phase, setPhase] = useState<1 | 2 | 3>(1); // 1: Upload, 2: Preview/Edit, 3: Success
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(false);
  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("Photo is too large. Please use a photo under 10MB.");
      return;
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!validTypes.includes(file.type)) {
      setError("Please upload an image file (JPG, PNG, WEBP, or HEIC)");
      return;
    }

    setError(null);
    setImageFile(file);
    
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setPhase(2);
      analyzeImage(file, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (file: File, base64Url: string) => {
    setIsAnalyzing(true);
    setAnalysisError(false);
    
    try {
      const base64Data = base64Url.split(',')[1];
      const today = getLocalDateString();
      
      const response = await fetch("/api/snap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: file.type,
          today
        })
      });

      if (!response.ok) {
        let errStr = "Failed to extract tasks";
        try {
          const errData = await response.json();
          if (errData.error) errStr = errData.error;
        } catch {
           // ignore
        }
        throw new Error(errStr);
      }

      const result: AnalysisResult = await response.json();
      
      // Add 'selected' property to all extracted tasks
      const initializedTasks = (result.tasks || []).map(t => ({
        ...t,
        selected: true,
        priority: t.priority || 'medium',
        deadline: t.deadline || '',
        name: t.name || ''
      }));
      
      setTasks(initializedTasks);
    } catch (err) {
      console.error("Analysis error:", err);
      setAnalysisError(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const retryAnalysis = () => {
    if (imageFile && imageSrc) {
      analyzeImage(imageFile, imageSrc);
    }
  };

  const resetToPhase1 = () => {
    setPhase(1);
    setImageSrc(null);
    setImageFile(null);
    setTasks([]);
    setError(null);
    setAnalysisError(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-zinc-400', 'bg-zinc-100');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-zinc-400', 'bg-zinc-100');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-zinc-400', 'bg-zinc-100');
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Create a synthetic event
      const syntheticEvent = {
        target: { files: e.dataTransfer.files }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileChange(syntheticEvent);
    }
  };

  const toggleTaskSelection = (index: number) => {
    const newTasks = [...tasks];
    newTasks[index].selected = !newTasks[index].selected;
    setTasks(newTasks);
  };

  const updateTask = (index: number, field: keyof ExtractedTask, value: any) => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setTasks(newTasks);
  };

  const deleteTask = (index: number) => {
    const newTasks = [...tasks];
    newTasks.splice(index, 1);
    setTasks(newTasks);
  };

  const addNewTaskRow = () => {
    setTasks([
      ...tasks,
      {
        name: "",
        deadline: "",
        priority: "medium",
        description: "",
        confidence: "high",
        raw_text: "",
        selected: true
      }
    ]);
  };

  const handleSaveTasks = async () => {
    const selectedTasks = tasks.filter(t => t.selected && t.name.trim() !== "");
    if (selectedTasks.length === 0) return;
    
    setIsSaving(true);
    try {
      let saved = 0;
      for (const t of selectedTasks) {
        const docRef = await addDoc(collection(db, "tasks"), {
          name: t.name.trim(),
          description: t.description || "",
          deadline: t.deadline || "",
          priority: t.priority || "medium",
          completed: false,
          userId: user.uid,
          createdAt: Date.now(),
          deadline_changes: 0,
          original_deadline: t.deadline || "",
          source: 'snap_and_plan'
        });
        
        saved++;
      }

      logActivity("snap", `Added ${saved} tasks via Snap & Plan`);
      
      // Trigger Auto-Rescheduler silently
      try {
        const todayString = getLocalDateString();
        fetch("/api/reschedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tasks: [], // Not passing full task list as we only trigger background update
            today: todayString,
            triggerDescription: `Added ${saved} tasks via Snap & Plan`
          })
        }).catch(e => console.error("Silent reschedule trigger failed:", e));
      } catch (e) {}

      setSavedCount(saved);
      setPhase(3); // Go to success state
    } catch (err) {
      console.error("Failed to save tasks:", err);
      alert("Failed to save tasks to your dashboard. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCount = tasks.filter(t => t.selected).length;

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col font-sans selection:bg-zinc-200">
      <Header user={user} onSignOut={onSignOut} />
      <Navigation user={user} />
      
      <main className="flex-1 w-full max-w-[900px] mx-auto px-6 md:px-12 py-8">
        
        {phase === 1 && (
          <div className="w-full">
            <header className="mb-8">
              <h1 className="text-[24px] font-normal text-zinc-900 tracking-[-0.02em]">Snap & Plan</h1>
              <p className="text-[15px] text-zinc-500 leading-[1.6] mt-1.5">
                Photograph a handwritten list, whiteboard, timetable,
                or assignment sheet — Gemini Vision extracts every task automatically.
              </p>
            </header>

            <div 
              className="w-full h-[280px] rounded-[10px] bg-zinc-50 border-[1.5px] border-dashed border-zinc-300 flex flex-col items-center justify-center transition-all duration-150 relative"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Camera className="w-10 h-10 text-zinc-400 mb-4" strokeWidth={1.5} />
              <h3 className="text-[18px] font-normal text-zinc-900 mb-1.5">Drop a photo here</h3>
              <p className="text-[14px] text-zinc-400 mb-6">or choose how to add one</p>
              
              <div className="flex flex-row gap-3">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white border border-zinc-200 text-zinc-900 text-[14px] font-medium px-5 py-2.5 rounded-[6px] hover:bg-zinc-50 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Upload size={14} />
                  Upload Photo
                </button>
                <button 
                  onClick={() => cameraInputRef.current?.click()}
                  className="bg-white border border-zinc-200 text-zinc-900 text-[14px] font-medium px-5 py-2.5 rounded-[6px] hover:bg-zinc-50 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Camera size={14} />
                  Use Camera
                </button>
              </div>

              {/* Hidden inputs */}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/jpeg,image/png,image/webp,image/heic" 
                onChange={handleFileChange} 
              />
              <input 
                type="file" 
                ref={cameraInputRef} 
                className="hidden" 
                accept="image/jpeg,image/png,image/webp,image/heic" 
                capture="environment" 
                onChange={handleFileChange} 
              />
            </div>
            
            {error && (
              <div className="mt-2 text-[13px] text-red-600 text-center">
                {error}
              </div>
            )}

            <div className="flex items-center justify-center gap-4 mt-3">
              <span className="text-[12px] text-zinc-400">Supports:</span>
              <div className="flex gap-2">
                <span className="border border-zinc-200 rounded-[4px] px-2 py-0.5 text-[11px] text-zinc-400 bg-white">JPG</span>
                <span className="border border-zinc-200 rounded-[4px] px-2 py-0.5 text-[11px] text-zinc-400 bg-white">PNG</span>
                <span className="border border-zinc-200 rounded-[4px] px-2 py-0.5 text-[11px] text-zinc-400 bg-white">WEBP</span>
                <span className="border border-zinc-200 rounded-[4px] px-2 py-0.5 text-[11px] text-zinc-400 bg-white">HEIC</span>
              </div>
            </div>

            <div className="mt-12">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-4">
                WORKS GREAT FOR
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                
                <div className="border border-zinc-200 rounded-[8px] p-[14px] px-4 bg-white shadow-sm">
                  <Pencil size={18} className="text-zinc-400 mb-2" />
                  <h4 className="text-[14px] font-medium text-zinc-900">Handwritten lists</h4>
                  <p className="text-[13px] text-zinc-500 line-height-[1.5] mt-1">Rough notes, bullet points, numbered lists on paper</p>
                </div>

                <div className="border border-zinc-200 rounded-[8px] p-[14px] px-4 bg-white shadow-sm">
                  <School size={18} className="text-zinc-400 mb-2" />
                  <h4 className="text-[14px] font-medium text-zinc-900">Assignment sheets</h4>
                  <p className="text-[13px] text-zinc-500 line-height-[1.5] mt-1">College or school assignment papers with multiple tasks</p>
                </div>

                <div className="border border-zinc-200 rounded-[8px] p-[14px] px-4 bg-white shadow-sm">
                  <Calendar size={18} className="text-zinc-400 mb-2" />
                  <h4 className="text-[14px] font-medium text-zinc-900">Timetables</h4>
                  <p className="text-[13px] text-zinc-500 line-height-[1.5] mt-1">Weekly or daily schedules with classes or meetings</p>
                </div>

                <div className="border border-zinc-200 rounded-[8px] p-[14px] px-4 bg-white shadow-sm">
                  <LayoutDashboard size={18} className="text-zinc-400 mb-2" />
                  <h4 className="text-[14px] font-medium text-zinc-900">Whiteboards</h4>
                  <p className="text-[13px] text-zinc-500 line-height-[1.5] mt-1">Meeting notes, sprint plans, or brainstorm boards</p>
                </div>

              </div>
            </div>
          </div>
        )}

        {phase === 2 && (
          <div className="flex flex-col md:flex-row gap-8">
            
            {/* LEFT COLUMN: Image Preview */}
            <div className="w-full md:w-[45%] shrink-0">
              <div className="sticky top-[80px]">
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2.5">
                  Your photo
                </div>
                {imageSrc && (
                  <img 
                    src={imageSrc} 
                    alt="Uploaded preview" 
                    className="w-full rounded-[8px] border border-zinc-200 object-contain max-h-[220px] md:max-h-[400px] bg-zinc-50"
                  />
                )}
                <button 
                  onClick={resetToPhase1}
                  className="text-[13px] text-zinc-500 underline mt-2.5 hover:text-zinc-800 transition-colors cursor-pointer"
                >
                  Change photo
                </button>

                {/* Analysis Status Bar */}
                <div className="mt-3">
                  {isAnalyzing && (
                    <div className="flex items-center gap-2">
                      <Loader2 size={16} className="text-zinc-400 animate-spin" />
                      <span className="text-[13px] text-zinc-500">Gemini Vision is reading your photo...</span>
                    </div>
                  )}
                  {!isAnalyzing && !analysisError && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-green-700" />
                      <span className="text-[13px] font-medium text-zinc-900">Found {tasks.length} tasks in your photo</span>
                    </div>
                  )}
                  {!isAnalyzing && analysisError && (
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={16} className="text-red-600" />
                        <span className="text-[13px] text-red-600 font-medium">Couldn't read this photo clearly</span>
                      </div>
                      <span className="text-[12px] text-zinc-500 ml-6">Try a clearer, well-lit photo</span>
                      <button 
                        onClick={retryAnalysis}
                        className="text-[12px] text-zinc-500 underline ml-6 hover:text-zinc-800 cursor-pointer"
                      >
                        Try again
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Extracted Tasks */}
            <div className="w-full md:w-[55%]">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2 mb-4">
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                  EXTRACTED TASKS
                </div>
                {!isAnalyzing && !analysisError && (
                  <div className="font-mono text-[12px] text-zinc-400">
                    {tasks.length} found
                  </div>
                )}
              </div>

              {isAnalyzing && (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i, idx) => (
                    <div 
                      key={i} 
                      className="h-[56px] rounded-[6px] bg-zinc-50 border border-zinc-100 animate-pulse"
                      style={{ animationDelay: `${idx * 150}ms` }}
                    ></div>
                  ))}
                </div>
              )}

              {!isAnalyzing && !analysisError && (
                <div className="flex flex-col gap-2">
                  {tasks.map((task, index) => (
                    <div 
                      key={index}
                      className={`border border-zinc-200 rounded-[8px] p-3 transition-opacity duration-200 relative bg-white ${!task.selected ? 'opacity-40 bg-zinc-50' : ''}`}
                    >
                      {/* Confidence Tag */}
                      {task.confidence === 'low' || task.confidence === 'medium' ? (
                        <div className="absolute top-[-8px] right-3 bg-orange-50 border border-orange-200 text-orange-700 text-[11px] font-medium px-1.5 py-0.5 rounded-[4px] z-10 shadow-sm" title="Gemini wasn't 100% sure about this one">
                          Review
                        </div>
                      ) : null}

                      <div className="flex items-start">
                        {/* Checkbox */}
                        <div className="pt-0.5 pr-3 shrink-0">
                          <input 
                            type="checkbox" 
                            checked={task.selected} 
                            onChange={() => toggleTaskSelection(index)}
                            className="w-4 h-4 rounded-[3px] border border-zinc-300 accent-zinc-900 cursor-pointer"
                          />
                        </div>

                        {/* Task Edit Area */}
                        <div className="flex-1 min-w-0 pr-2">
                          <input 
                            type="text" 
                            value={task.name}
                            onChange={(e) => updateTask(index, 'name', e.target.value)}
                            placeholder="Task name"
                            className="w-full bg-transparent border-b border-zinc-200 focus:border-zinc-500 outline-none text-[14px] font-medium text-zinc-900 py-0.5 placeholder:text-zinc-300 transition-colors"
                            disabled={!task.selected}
                          />
                          
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {/* Priority Selector */}
                            <div className="flex rounded-[4px] overflow-hidden border border-zinc-200">
                              <button 
                                onClick={() => updateTask(index, 'priority', 'high')}
                                disabled={!task.selected}
                                className={`text-[11px] px-2 py-0.5 font-medium transition-colors border-r border-zinc-200 cursor-pointer ${task.priority === 'high' ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-white text-zinc-400 hover:bg-zinc-50'}`}
                              >
                                High
                              </button>
                              <button 
                                onClick={() => updateTask(index, 'priority', 'medium')}
                                disabled={!task.selected}
                                className={`text-[11px] px-2 py-0.5 font-medium transition-colors border-r border-zinc-200 cursor-pointer ${task.priority === 'medium' ? 'bg-[#FFF7ED] text-[#C2410C]' : 'bg-white text-zinc-400 hover:bg-zinc-50'}`}
                              >
                                Medium
                              </button>
                              <button 
                                onClick={() => updateTask(index, 'priority', 'low')}
                                disabled={!task.selected}
                                className={`text-[11px] px-2 py-0.5 font-medium transition-colors cursor-pointer ${task.priority === 'low' ? 'bg-[#F0FDF4] text-[#15803D]' : 'bg-white text-zinc-400 hover:bg-zinc-50'}`}
                              >
                                Low
                              </button>
                            </div>

                            {/* Deadline Input */}
                            <input 
                              type="date"
                              value={task.deadline || ''}
                              onChange={(e) => updateTask(index, 'deadline', e.target.value)}
                              disabled={!task.selected}
                              className="border border-zinc-200 rounded-[4px] px-2 py-0.5 text-[12px] font-mono text-zinc-500 bg-white outline-none focus:border-zinc-400"
                            />
                          </div>
                        </div>

                        {/* Delete Button */}
                        <div className="shrink-0 pt-0.5">
                          <button 
                            onClick={() => deleteTask(index)}
                            className="text-zinc-300 hover:text-zinc-900 transition-colors p-1 rounded hover:bg-zinc-100 cursor-pointer"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button 
                    onClick={addNewTaskRow}
                    className="w-full border border-dashed border-zinc-300 rounded-[8px] py-2.5 text-[13px] text-zinc-500 hover:text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50 transition-colors mt-1 cursor-pointer"
                  >
                    + Add another task manually
                  </button>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-5">
                    <div className="text-[13px] text-zinc-500">
                      {selectedCount} of {tasks.length} tasks selected
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button 
                        onClick={resetToPhase1}
                        disabled={isSaving}
                        className="border border-zinc-200 bg-white text-zinc-600 text-[13px] font-medium px-4 py-2 rounded-[6px] hover:bg-zinc-50 transition-colors cursor-pointer"
                      >
                        Discard
                      </button>
                      <button 
                        onClick={handleSaveTasks}
                        disabled={selectedCount === 0 || isSaving}
                        className="bg-zinc-900 text-white text-[13px] font-medium px-4 py-2 rounded-[6px] hover:bg-zinc-800 disabled:bg-zinc-300 transition-colors flex items-center justify-center cursor-pointer min-w-[150px]"
                      >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : `Add ${selectedCount} Tasks to Stride`}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {phase === 3 && (
          <div className="w-full md:w-[55%] ml-auto min-h-[400px] flex flex-col items-center justify-center text-center">
            <CheckCircle2 size={48} className="text-green-700 mb-4" strokeWidth={1.5} />
            <h2 className="text-[18px] font-normal text-zinc-900 mb-1.5">{savedCount} tasks added to Stride</h2>
            <p className="text-[14px] text-zinc-500 mb-6">They're now in your dashboard, prioritized and ready.</p>
            
            <div className="flex gap-2">
              <button 
                onClick={resetToPhase1}
                className="border border-zinc-200 bg-white text-zinc-700 text-[13px] font-medium px-4 py-2 rounded-[6px] hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                Snap Another Photo
              </button>
              <button 
                onClick={() => window.location.href = '/dashboard'}
                className="bg-zinc-900 text-white text-[13px] font-medium px-4 py-2 rounded-[6px] hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
