package com.nicknassar.pumpkinspice;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.FileInputStream;
import java.io.BufferedWriter;
import java.io.OutputStreamWriter;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.File;
import java.io.FileNotFoundException;

import java.nio.charset.Charset;

class TemplateFiller {
    private static class Error extends Exception {
	Error(Throwable cause) {
	    super(cause);
	}
	Error(String cause) {
	    super(cause);
	}
    }
    private static class TemplateConfig {
	public String source;
	public String destination;
	public String templateFolder;
        public String searchPath[];

        TemplateConfig() {
	    source = null;
	    destination = null;
	}

        void setSearchPath(String path) {
            searchPath = path.split(File.pathSeparator);
        }

        String getSourcePath() throws Error {
            return getFileOnPath(source);
        }

        String getFileOnPath(String filename) throws Error {
            File f = new File(filename);
            if (f.exists()) {
                return filename;
            } else if (searchPath != null) {
                for (String path: searchPath) {
                    f = new File(path, filename);
                    if (f.exists()) {
                        return f.getPath();
                    }
                }
            } else if (templateFolder != null) {
                f = new File(templateFolder, filename);
                if (f.exists()) {
                    return f.getPath();
                }
            }
            throw new Error("Can't find file "+filename+" in path");
        }

	boolean isValid() {
	    return source != null && destination != null;	}

	static TemplateConfig parseArgs(String args[]) throws Error {
	    TemplateConfig config = new TemplateConfig();
	    String previousArg = null;
	    for (String arg: args) {
                if (arg.equals("--path")) {
                    previousArg = arg;
                } else if (previousArg != null && previousArg.equals("--path")) {
                    config.setSearchPath(arg);
                    previousArg = null;
                } else if (config.source == null) {
		    config.source = arg;

		    File src = new File(config.source);
		    config.templateFolder = src.getParent();

		} else if (config.destination == null) {
		    config.destination = arg;
		} else {
		    throw new Error("Too many arguments");
		}
	    }
            if (previousArg != null)
                throw new Error("expected more arguments");
	    if (config.source != null && config.destination == null) {
		if (config.source.endsWith(".template")) {
		    config.destination = config.source.substring(0, config.source.length()-9);
		}
	    }
	    return config;
	}
    }

    public static void main(String args[]){
	try {
	    TemplateConfig config = TemplateConfig.parseArgs(args);
	    if (!config.isValid()) {
		System.out.println("Usage: templatefiller filename.template [<filename>]");
		System.exit(1);
	    } else  {
		try {
		    TemplateFiller filler = new TemplateFiller(config);
		    filler.run();
		} catch (Exception e) {
		    System.out.println("Error filling "+config.destination+": "+e);
		    System.exit(2);
		}
	    }
	} catch (Error e) {
	    System.out.println("Error: "+e);
	    System.exit(1);
	}
    }

    private TemplateConfig config;

    TemplateFiller(TemplateConfig config) {
	this.config = config;
    }

    public void run() throws Error {
        BufferedReader template;
        BufferedWriter out;
	try {
            template = new BufferedReader(new InputStreamReader(new FileInputStream(config.getSourcePath()), Charset.forName("UTF-8").newDecoder()));
	    out = new BufferedWriter(new OutputStreamWriter(new FileOutputStream(config.destination), Charset.forName("UTF-8").newEncoder()));
	} catch (FileNotFoundException e) {
	    throw new Error(e);
	}
	fillTemplate(template, out);
        try {
            out.close();
        } catch (IOException e) {
            throw new Error(e);
        }
    }

    private void fillTemplate(BufferedReader template, BufferedWriter out) throws Error {
	try {

	    String line = template.readLine();
	    while (line != null) {
		fillLine(line, out);
		line = template.readLine();
	    }
	} catch (IOException e) {
	    throw new Error(e);
	}
    }

    private void fillLine(String line, BufferedWriter out) throws IOException, Error {
	int start = 0;
	int match = line.indexOf("{{", start);
	while (match > -1) {
	    out.write(line.substring(start, match));

	    int end = line.indexOf("}}",match);
	    if (end == -1) {
		out.newLine();
		return;
	    } else {
		start = end+2;
	    }

	    String filename = line.substring(match+2,end);
            BufferedReader subTemplate = new BufferedReader(new InputStreamReader(new FileInputStream(config.getFileOnPath(filename)), Charset.forName("UTF-8").newDecoder()));
            fillTemplate(subTemplate, out);

	    match = line.indexOf("{{", start);
	}
	out.write(line.substring(start, line.length()));
	out.newLine();
    }
}
